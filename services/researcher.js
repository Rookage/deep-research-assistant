const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

// ============ Query Generation ============

const QUERY_PROMPT = `你是一个搜索策略专家。根据研究纲要生成搜索查询。

对于每个子问题，生成 3 组搜索词（中英文各一组 + 一个更具体的中文搜索词）。
返回纯 JSON 数组，不要加任何解释。

格式示例：
[
  {"subQuestion": "子问题1", "queries": ["中文搜索词", "english search query", "更具体的中文词"]},
  {"subQuestion": "子问题2", "queries": ["中文搜索词", "english query", "site:example.com 关键词"]}
]

研究纲要：`;

async function generateQueries(brief, apiKey) {
  const briefText = JSON.stringify(brief, null, 2);
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: QUERY_PROMPT },
        { role: 'user', content: briefText },
      ],
      max_tokens: 1024,
      temperature: 0.5,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`DeepSeek error: ${res.status}`);
  const data = await res.json();
  const text = data.choices[0].message.content.trim();

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
  return JSON.parse(jsonMatch[1]);
}

// ============ Search Providers ============

// Provider: Baidu (HTML scraping, works in China, no API key needed)
async function searchBaidu(query) {
  try {
    const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=5`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return [];
    const html = await res.text();

    // Baidu HTML result parsing
    const results = [];
    // Match Baidu result blocks: h3 title + link + abstract
    const blockRegex = /<div[^>]*class="(?:result|c-container)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="(?:result|c-container)|$)/gi;
    const blocks = html.match(blockRegex) || [];

    for (const block of blocks.slice(0, 5)) {
      // Extract title and URL from h3 > a
      const titleMatch = block.match(/<a[^>]*href="(https?:\/\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      // Extract abstract
      const absMatch = block.match(/<span[^>]*class="content-right_[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
        || block.match(/<div[^>]*class="c-abstract[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
        || block.match(/<span[^>]*class="c-abstract[^"]*"[^>]*>([\s\S]*?)<\/span>/i);

      if (titleMatch) {
        const rawUrl = titleMatch[1];
        const title = titleMatch[2].replace(/<[^>]*>/g, '').trim();
        const snippet = absMatch ? absMatch[1].replace(/<[^>]*>/g, '').trim() : '';
        try {
          const domain = new URL(rawUrl).hostname.replace('www.', '');
          results.push({ url: rawUrl, title, snippet, domain });
        } catch {}
      }
    }
    return results;
  } catch (e) {
    console.warn(`[Baidu] Search failed for "${query.slice(0, 40)}...": ${e.message}`);
    return [];
  }
}

// Provider: Bing Web Search API
// Free tier: 1000 transactions/month via Azure (works in China)
async function searchBingAPI(query, apiKey) {
  const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=5&mkt=zh-CN`;
  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return (data.webPages?.value || []).map(r => ({
    url: r.url,
    title: r.name,
    snippet: r.snippet,
    domain: new URL(r.url).hostname.replace('www.', ''),
  }));
}

// ============ Content Fetching ============

const { spawn } = require('child_process');
const path = require('path');

async function fetchContentScrapling(url) {
  /** Fetch content using Scrapling Python script (adaptive, TLS-fingerprinted) */
  return new Promise((resolve) => {
    const script = path.join(__dirname, '..', 'python', 'scrapling_fetch.py');
    const proc = spawn('python', [script, url], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());

    proc.on('close', (code) => {
      if (code !== 0) { resolve(null); return; }
      try {
        const result = JSON.parse(stdout);
        if (result.error) { resolve(null); return; }
        resolve({
          text: result.text || '',
          title: result.title || '',
          publishedAt: result.published_at || null,
          domain: result.domain || '',
        });
      } catch {
        resolve(null);
      }
    });

    proc.on('error', () => resolve(null));
  });
}

async function fetchContent(url) {
  // Try Scrapling first (adaptive, handles Cloudflare, better extraction)
  const scraplingResult = await fetchContentScrapling(url);
  if (scraplingResult && scraplingResult.text) {
    return scraplingResult;
  }

  // Fallback: basic HTTP fetch + regex extraction
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const html = await res.text();

    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#?\w+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000);

    // Try to extract publish date
    const dateMatch = html.match(/date(?:Published|published)[":\s]*["']?(\d{4}-\d{2}-\d{2})/i)
      || html.match(/<meta[^>]*property="article:published_time"[^>]*content="([^"]*)/i)
      || html.match(/<time[^>]*datetime="([^"]*)/i);

    return { text, publishedAt: dateMatch ? dateMatch[1] : null };
  } catch (e) {
    return null;
  }
}

// ============ Annotation ============

function classifyFreshness(publishedAt) {
  if (!publishedAt) return 'unknown';
  const age = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24 * 365);
  return age < 1 ? 'green' : age < 2 ? 'yellow' : 'red';
}

function classifySource(domain) {
  const gov = /\.gov\.cn$|\.gov$/;
  const edu = /\.edu\.cn$|\.edu$/;
  const official = /people\.com\.cn|xinhuanet\.com|cctv\.com|china\.com\.cn|www\.gov\.cn/;
  const media = /eastmoney\.com|36kr\.com|huxiu\.com|cls\.cn|caixin\.com|thepaper\.cn|ifeng\.com|sina\.com\.cn|sina\.com|163\.com|qq\.com|sohu\.com|ftchinese\.com|jiemian\.com/;
  const research = /mckinsey|deloitte|pwc|bcg|bain|gartner|idc|iresearch\.cn|analysys|questmobile|autohome\.com|bitauto\.com|1234567\.com/;
  const community = /zhihu\.com|jianshu\.com|csdn\.net|juejin\.cn|douban\.com/;

  if (gov.test(domain) || edu.test(domain) || official.test(domain)) return 'A';
  if (media.test(domain) || research.test(domain)) return 'B';
  if (community.test(domain)) return 'C';
  return 'B';
}

function annotateResult(result, content) {
  return {
    url: result.url,
    title: result.title,
    snippet: result.snippet,
    domain: result.domain,
    credibility: classifySource(result.domain),
    freshness: content?.publishedAt
      ? classifyFreshness(content.publishedAt)
      : result.publishedAt ? classifyFreshness(result.publishedAt) : 'unknown',
    publishedAt: content?.publishedAt || result.publishedAt || null,
    content: content?.text?.slice(0, 2000) || null,
  };
}

// ============ Main Orchestrator ============

async function research(brief, apiKey, searchConfig = {}, onProgress) {
  // Step 1: Generate search queries
  if (onProgress) onProgress({ phase: 'queries', message: '正在生成搜索策略...' });
  const queryGroups = await generateQueries(brief, apiKey);
  const allQueries = [];
  for (const group of queryGroups) {
    for (const q of group.queries) {
      allQueries.push({ subQuestion: group.subQuestion, query: q });
    }
  }

  // Step 2: Execute searches with configured provider
  const provider = searchConfig.provider || 'baidu';
  const searchKey = searchConfig.apiKey || '';
  const searchFn = provider === 'bing' && searchKey
    ? (q) => searchBingAPI(q, searchKey)
    : searchBaidu;

  const allResults = [];
  const seen = new Set();

  for (let i = 0; i < allQueries.length; i++) {
    const { subQuestion, query } = allQueries[i];
    if (onProgress) onProgress({ phase: 'search', message: `搜索中 (${i + 1}/${allQueries.length}): ${query.slice(0, 40)}...` });

    const results = await searchFn(query);
    for (const r of results) {
      const key = r.url;
      if (!seen.has(key)) {
        seen.add(key);
        allResults.push({ ...r, subQuestion, query });
      }
    }
    // Polite delay between searches
    await new Promise(r => setTimeout(r, 800));
  }

  // Step 3: Fetch content for top results (max 15)
  const topResults = allResults.slice(0, 15);
  const annotated = [];

  for (let i = 0; i < topResults.length; i++) {
    const r = topResults[i];
    if (onProgress) onProgress({ phase: 'fetch', message: `提取内容 (${i + 1}/${topResults.length}): ${r.domain}` });
    const content = await fetchContent(r.url);
    annotated.push(annotateResult(r, content));
  }

  // Step 4: Stats
  const stats = {
    totalSources: annotated.length,
    totalQueries: allQueries.length,
    provider: provider === 'bing' ? 'bing' : 'baidu',
    credibility: { A: 0, B: 0, C: 0 },
    freshness: { green: 0, yellow: 0, red: 0, unknown: 0 },
  };
  for (const a of annotated) {
    stats.credibility[a.credibility] = (stats.credibility[a.credibility] || 0) + 1;
    stats.freshness[a.freshness] = (stats.freshness[a.freshness] || 0) + 1;
  }

  return { sources: annotated, stats, queryGroups };
}

module.exports = { research, generateQueries };
