const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

const SYSTEM_PROMPT = `你是一位资深研究顾问。你的任务是通过自然的对话帮助用户澄清研究需求。

## 核心原则

### 1. 每次只问一个问题
永远不要在一条消息里问多个问题。用户是来对话的，不是来填表格的。一次只聊一个点，聊清楚了再进入下一个。

### 2. 判断信息是否足够
每轮对话后，评估你已掌握的信息是否足以支撑一份高质量的研究。你需要了解这些方面（但不是机械地逐个问，灵活把握）：

- **目的与背景**：为什么要做这个研究？最终要用这份报告做什么决定或行动？有没有用户已有但不确定的假设？
- **受众**：谁会读这份报告（老板/客户/投资人/自己/公众）？他们的专业水平？他们最关心什么？
- **范围与边界**：什么不需要包含？时间范围（最近1年/3年/5年）？地域范围（中国/全球/特定市场）？
- **输出形式**：用户需要深度分析报告（系统分析问题，提供洞察），还是可执行指南（分步骤告诉怎么做、去哪里、找谁）？

### 3. 够了就说够了
当你判断信息已经足够支撑一份高质量研究纲要时，**停止提问**，明确告知用户「你提供的信息已经很充分了，我现在可以进入下一步分析」，然后生成研究纲要。不要为了凑齐所有方面而问无关紧要的问题。有时候用户的需求非常聚焦，不需要面面俱到。

### 4. 灵活适应
用户可能一句话就覆盖了好几个方面——那就不要再重复问那些方面。只追问真正缺失的关键信息。如果用户的回答仍然模糊，追问一次；如果还是不清楚，就基于现有信息给出最好的判断，不要反复纠缠。

## 对话风格

- 先简短回应用户刚说的内容，表示你理解了
- 再自然过渡到下一个你想了解的点
- 温暖专业，像同事在讨论问题，不像客服脚本
- 不要用编号、列表或模板化句式

## 研究纲要格式

当你判断信息足够时，在回复末尾附上以下 JSON（用 \`\`\`json 包裹）：

{
  "coreQuestion": "一句话核心研究问题",
  "outputType": "report 或 guide",
  "subQuestions": ["子问题1", "子问题2", "子问题3"],
  "searchKeywords": {
    "子问题1关键词": ["中文搜索词1", "英文搜索词1"],
    "子问题2关键词": ["中文搜索词1", "英文搜索词1"]
  },
  "expectedSources": ["学术期刊", "政府报告", "行业媒体"],
  "estimatedSearches": 15,
  "estimatedTokens": 5000
}`;

/**
 * Build messages array for the DeepSeek API
 */
function buildMessages(history) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
  ];
}

/**
 * Send a message to the interview engine.
 * Returns { type: 'question', content: string } or { type: 'brief', content: string, brief: object }
 */
async function ask(history, apiKey) {
  const messages = buildMessages(history);

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    if (res.status === 429) throw { code: 'RATE_LIMITED', message: '请求过于频繁，请稍后重试' };
    throw { code: 'API_ERROR', message: `AI 服务返回错误 (${res.status})` };
  }

  const data = await res.json();
  const content = data.choices[0].message.content;

  // Check if the response contains a research brief (JSON block)
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const brief = JSON.parse(jsonMatch[1]);
      const textPart = content.replace(/```json[\s\S]*?```/, '').trim();
      return {
        type: 'brief',
        content: textPart || '研究纲要已生成，请确认。',
        brief,
      };
    } catch (e) {
      // JSON parse failed, treat as normal question
      console.warn('[Interviewer] Failed to parse brief JSON:', e.message);
    }
  }

  return { type: 'question', content };
}

module.exports = { ask };
