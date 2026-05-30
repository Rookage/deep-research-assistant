/**
 * Perspective Discovery Engine — inspired by Stanford STORM
 * Discovers multiple viewpoints on a research topic before searching.
 */

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

const PERSPECTIVE_PROMPT = `你是一位研究策略專家。給定一個研究主題，你需要從不同角度發現多元視角。

## 視角維度
從以下維度中考慮（不是每個主題都需要全部）：
- 政策/法規視角：政府政策、法律法規、監管趨勢
- 市場/商業視角：市場規模、競爭格局、商業模式
- 技術/學術視角：技術發展、學術研究、創新趨勢
- 社會/消費者視角：社會影響、消費者行為、公眾輿論
- 國際/比較視角：國際經驗、跨國比較、地緣政治

## 輸出格式
返回純 JSON，不要加任何解釋：
{
  "perspectives": [
    {
      "name": "視角名稱（簡潔）",
      "rationale": "為什麼這個視角對理解主題很重要（一句話）",
      "coreQuestions": ["核心問題1", "核心問題2"]
    }
  ],
  "crossCuttingThemes": ["貫穿多個視角的共同主題1", "共同主題2"]
}

## 規則
1. 每個主題發現 3-5 個視角
2. 每個視角 2-3 個核心問題
3. 視角之間應該有明顯區別，避免重疊
4. 核心問題應該是可以通過搜索回答的具體問題
5. 貫穿主題是連接不同視角的線索`;

/**
 * Discover multiple perspectives on a research topic.
 * @param {object} brief - Research brief from stage 1
 * @param {string} apiKey - DeepSeek API key
 * @returns {object} { perspectives, crossCuttingThemes }
 */
async function discoverPerspectives(brief, apiKey) {
  const topic = brief.coreQuestion || brief.title || JSON.stringify(brief);
  const context = brief.subQuestions
    ? `\n已識別的子問題：\n${brief.subQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
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
        { role: 'system', content: PERSPECTIVE_PROMPT },
        { role: 'user', content: `研究主題：${topic}${context}\n\n請為這個主題發現多元研究視角。` },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`DeepSeek API error: ${res.status}${errText ? ' - ' + errText.slice(0, 200) : ''}`);
  }

  const data = await res.json();
  const text = data.choices[0].message.content.trim();

  // Parse JSON from response
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) jsonStr = jsonMatch[1];

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.warn('[PerspectiveEngine] JSON parse failed, returning basic structure');
    return {
      perspectives: [
        { name: '綜合分析', rationale: '全面理解研究主題', coreQuestions: [topic] },
      ],
      crossCuttingThemes: [],
    };
  }
}

/**
 * Generate follow-up questions based on search results (simulated expert dialogue).
 * @param {string} perspective - The perspective being explored
 * @param {string} previousFindings - Summary of previous search round
 * @param {string} apiKey - DeepSeek API key
 * @returns {string[]} Array of follow-up questions
 */
async function generateFollowUpQuestions(perspective, previousFindings, apiKey) {
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是一位專業研究員，正在從「${perspective}」視角深入研究一個主題。基於目前已發現的資訊，提出 2-3 個更深入的追問。這些問題應該：
1. 基於已發現的資訊，但進一步挖掘
2. 填補知識空白
3. 挑戰或驗證已發現的資訊
4. 引出更具體的細節

返回純 JSON 格式：{"questions": ["追問1", "追問2", "追問3"]}`,
        },
        {
          role: 'user',
          content: `目前發現：\n${previousFindings}\n\n基於以上發現，請提出更深入的追問。`,
        },
      ],
      max_tokens: 512,
      temperature: 0.8,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) return [];

  const data = await res.json();
  const text = data.choices[0].message.content.trim();

  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) jsonStr = jsonMatch[1];

  try {
    const parsed = JSON.parse(jsonStr);
    return parsed.questions || [];
  } catch {
    return [];
  }
}

module.exports = { discoverPerspectives, generateFollowUpQuestions };
