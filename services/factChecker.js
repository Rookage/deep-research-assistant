const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

const SYSTEM_PROMPT = `你是一个事实核查专家。给定一组来源素材，提取关键事实主张并交叉验证。

## 什么是"可验证的事实主张"
- 可以被证据证实或反驳的陈述（如"2024年新能源汽车销量增长35%"）
- 具体的数据、日期、事件、因果关系
- 不是观点、推测、个人经验或模糊描述

## 提取规则
1. 每条主张必须能从素材中找到出处
2. 每条主张标注支持它的来源 URL 列表
3. 如果某个主张只有一个来源支持，标记为 "single_source"
4. 如果不同来源对同一事实有矛盾说法，标记为 "disputed" 并列出双方

## 输出格式
返回纯 JSON，不要加任何解释：
{
  "claims": [
    {
      "claim": "具体的事实主张",
      "verification": "verified",
      "supportingSources": ["https://source1.com", "https://source2.com"],
      "confidence": "high"
    }
  ],
  "summary": "整体评估（2-3句话）"
}

verification 取值：
- "verified": 至少 2 个独立来源确认
- "single_source": 仅 1 个来源提及（标注风险）
- "disputed": 来源之间存在矛盾

confidence 取值：
- "high": 多个权威来源一致
- "medium": 有支持但来源级别不够高
- "low": 来源冲突或单一 C 级来源`;

async function verify(sources, brief, apiKey) {
  if (!sources || sources.length === 0) {
    return {
      claims: [],
      stats: { totalClaims: 0, verified: 0, singleSource: 0, disputed: 0 },
      summary: '没有素材可供核查。',
    };
  }

  // Build source text blob
  const sourceTexts = sources.map((s, i) => {
    const content = s.content || s.snippet || '';
    return `[来源${i + 1}] ${s.title}\nURL: ${s.url}\n域名: ${s.domain}\n信源级别: ${s.credibility}\n内容: ${content.slice(0, 1500)}`;
  }).join('\n\n---\n\n');

  const briefText = brief
    ? `\n研究主题：${brief.coreQuestion || brief}`
    : '';

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `以下是从搜索中获取的素材来源。请提取关键事实主张并进行交叉验证。${briefText}\n\n${sourceTexts}` },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`DeepSeek API error: ${res.status}${errText ? ' - ' + errText.slice(0, 200) : ''}`);
  }

  const data = await res.json();
  const text = data.choices[0].message.content.trim();

  // Parse JSON from response (may be wrapped in ```json)
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) jsonStr = jsonMatch[1];

  // Try to fix common JSON truncation: find last complete claim object
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    // Try to salvage: truncate to last complete "claim" object
    const lastComplete = jsonStr.lastIndexOf('"}');
    if (lastComplete > 0) {
      const salvaged = jsonStr.slice(0, lastComplete + 2) + '\n  ]\n}';
      try {
        parsed = JSON.parse(salvaged);
      } catch (e2) {
        throw new Error(`无法解析验证结果: ${e.message}`);
      }
    } else {
      throw new Error(`无法解析验证结果: ${e.message}`);
    }
  }

  const claims = parsed.claims || [];
  const stats = {
    totalClaims: claims.length,
    verified: claims.filter(c => c.verification === 'verified').length,
    singleSource: claims.filter(c => c.verification === 'single_source').length,
    disputed: claims.filter(c => c.verification === 'disputed').length,
  };

  return { claims, stats, summary: parsed.summary || '' };
}

module.exports = { verify };
