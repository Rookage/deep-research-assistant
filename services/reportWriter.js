const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

// ============ Outline Generation ============

const OUTLINE_PROMPT = `你是一位资深研究报告撰写专家。根据研究纲要和事实核查结果，生成一份专业的文档大纲。

## 文档结构模板

根据输出类型选择结构：

**深度报告**：摘要 → 研究背景 → 研究方法 → 核心发现（可分2-4个子节）→ 结论与展望 → 参考文献

**执行指南**：问题定义 → 方案对比 → 推荐方案 → 分步执行计划 → 资源与工具清单 → 参考文献

## 规则
1. 每个章节写明标题和 2-4 个关键要点
2. 标注哪些发现是"已验证"（多源确认），哪些是"单一来源"（需谨慎）
3. 估计全文所需 tokens
4. 返回纯 JSON，不要加任何解释

## 输出格式
{
  "title": "报告标题",
  "type": "深度报告",
  "sections": [
    {"title": "摘要", "keyPoints": ["要点1", "要点2"], "estimatedTokens": 200}
  ],
  "estimatedTokens": 2000
}`;

async function generateOutline(brief, verification, apiKey) {
  const briefText = typeof brief === 'string' ? brief : JSON.stringify(brief, null, 2);

  let verificationText = '';
  if (verification) {
    const v = verification.stats || verification;
    verificationText = `\n事实核查结果：共识别 ${v.totalClaims || 0} 条关键主张，已验证 ${v.verified || 0} 条，单一来源 ${v.singleSource || 0} 条，存在争议 ${v.disputed || 0} 条。`;
    if (verification.summary) verificationText += `\n核查摘要：${verification.summary}`;
  }

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: OUTLINE_PROMPT },
        { role: 'user', content: `研究纲要：${briefText}${verificationText}\n\n请根据以上信息生成文档大纲。` },
      ],
      max_tokens: 1024,
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`DeepSeek API error: ${res.status}${errText ? ' - ' + errText.slice(0, 200) : ''}`);
  }

  const data = await res.json();
  const text = data.choices[0].message.content.trim();
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
  return JSON.parse(jsonMatch[1]);
}

// ============ Section Content Generation ============

const SECTION_PROMPT = `你是一位专业的研究报告作者。根据提供的全部素材，撰写指定章节的完整内容。

## 规则
1. 用 HTML 格式输出内容（<p>, <h3>, <ul><li>, <strong> 等）
2. 每个关键数据或事实后面标注来源索引号，格式如 [1] [2]
3. 如果某个数据来自单一来源或存在争议，用 <em class="warning">标注</em>
4. 保持专业、客观的语气
5. 只输出该章节的 HTML 内容，不要加"## 章节标题"之类的markdown标记
6. 输出末尾附上本章引用的来源索引列表，格式：<!-- citations: 0,3,5 -->`;

async function generateSection(section, brief, sources, reportContext, apiKey) {
  // Build source reference text
  const sourceRefs = sources.map((s, i) =>
    `[${i}] ${s.title} (${s.domain}, 信源${s.credibility}级, ${s.freshness === 'green' ? '有效' : s.freshness === 'yellow' ? '偏旧' : s.freshness === 'red' ? '过时' : '时效未知'})\n   URL: ${s.url}\n   内容摘要: ${(s.content || s.snippet || '').slice(0, 800)}`
  ).join('\n\n');

  // Build context from previously generated sections
  let contextText = '';
  if (reportContext && reportContext.length > 0) {
    contextText = '\n已生成的章节摘要：\n' + reportContext.map(s =>
      `- ${s.title}: ${(s.content || '').replace(/<[^>]*>/g, '').slice(0, 200)}...`
    ).join('\n');
  }

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SECTION_PROMPT },
        { role: 'user', content: `报告主题：${typeof brief === 'string' ? brief : (brief.coreQuestion || brief.title || '')}\n\n章节标题：${section.title}\n章节要点：${(section.keyPoints || []).join('；')}\n\n全部素材来源（共${sources.length}条）：\n${sourceRefs}${contextText}\n\n请开始撰写「${section.title}」章节的完整内容。` },
      ],
      max_tokens: 2048,
      temperature: 0.5,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`DeepSeek API error: ${res.status}${errText ? ' - ' + errText.slice(0, 200) : ''}`);
  }

  const data = await res.json();
  const html = data.choices[0].message.content.trim();

  // Extract citations from comment at end
  const citationMatch = html.match(/<!--\s*citations:\s*([\d,\s]+)\s*-->/);
  const citations = citationMatch
    ? citationMatch[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
    : [];

  // Remove the citation comment from content
  const content = html.replace(/<!--\s*citations:[\s\S]*?-->/g, '').trim();

  return { title: section.title, content, citations };
}

// ============ Report Assembly ============

function assembleReport(outline, sections, sources, verification) {
  // Build references from sources that were actually cited
  const citedIndices = new Set();
  for (const section of sections) {
    for (const idx of (section.citations || [])) {
      citedIndices.add(idx);
    }
  }

  const references = [];
  const indexMap = {}; // old index → new index
  let refIdx = 1;
  for (const i of citedIndices) {
    if (sources[i]) {
      indexMap[i] = refIdx;
      references.push({
        index: refIdx,
        title: sources[i].title,
        url: sources[i].url,
        domain: sources[i].domain,
        credibility: sources[i].credibility,
        freshness: sources[i].freshness,
        publishedAt: sources[i].publishedAt || null,
      });
      refIdx++;
    }
  }

  // Re-number citations in section content
  const renumberedSections = sections.map(section => {
    let content = section.content;
    // Replace [oldIndex] with [newIndex]
    for (const [oldIdx, newIdx] of Object.entries(indexMap)) {
      content = content.replace(new RegExp(`\\[${oldIdx}\\]`, 'g'), `[${newIdx}]`);
    }
    const newCitations = (section.citations || [])
      .map(old => indexMap[old])
      .filter(Boolean);
    return { title: section.title, content, citations: newCitations };
  });

  return {
    title: outline.title,
    type: outline.type || '深度报告',
    meta: {
      generatedAt: new Date().toISOString(),
      sourceCount: sources.length,
      citedCount: references.length,
      verifiedClaims: verification?.stats?.verified || 0,
      singleSourceClaims: verification?.stats?.singleSource || 0,
      disputedClaims: verification?.stats?.disputed || 0,
    },
    sections: renumberedSections,
    references,
  };
}

module.exports = { generateOutline, generateSection, assembleReport };
