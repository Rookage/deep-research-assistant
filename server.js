require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const interviewer = require('./services/interviewer');
const researcher = require('./services/researcher');
const factChecker = require('./services/factChecker');
const reportWriter = require('./services/reportWriter');
const sessionStore = require('./services/sessionStore');

const app = express();
const PORT = process.env.PORT || 3001;

// Runtime config
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const SEARCH_CONFIG = {
  // "bing" → Bing Search API (free 1000/mo via Azure, works in China)
  // "demo" → returns empty (tests pipeline structure)
  provider: process.env.SEARCH_PROVIDER || 'demo',
  apiKey: process.env.BING_API_KEY || '',
};

// Session store (in-memory + JSON file persistence)
const sessions = new Map();

// Load existing sessions from disk
(function loadSessions() {
  try {
    const list = sessionStore.list();
    for (const meta of list) {
      const session = sessionStore.load(meta.id);
      if (session) sessions.set(meta.id, session);
    }
    if (list.length > 0) console.log(`[DeepResearch] Loaded ${list.length} saved sessions`);
  } catch (e) {
    console.warn('[DeepResearch] Failed to load sessions:', e.message);
  }
})();

// Ensure directories
['output', 'db'].forEach(d => fs.mkdirSync(path.join(__dirname, d), { recursive: true }));

app.use(express.json());
app.use(express.static('public'));
app.use('/output', express.static('output'));

// Ensure UTF-8 charset on all text responses (belt-and-suspenders for Windows)
app.use((req, res, next) => {
  const origSet = res.set.bind(res);
  res.set = function (field, val) {
    if (field && typeof field === 'string' && field.toLowerCase() === 'content-type') {
      if (/^text\//.test(val) && !val.includes('charset')) {
        val += '; charset=UTF-8';
      }
    }
    return origSet(field, val);
  };
  next();
});

// API cache control
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// ============ Routes ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, version: '0.4.0' });
});

// Stage 1: Start interview — user provides initial topic
app.post('/api/interview/start', async (req, res, next) => {
  try {
    const { topic } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ success: false, error: { message: '请输入研究主题' } });
    }

    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({ success: false, error: { message: 'DeepSeek API Key 未配置' } });
    }

    // Create session
    const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const history = [{ role: 'user', content: topic.trim() }];

    console.log(`[Interview] Session ${sessionId} started: "${topic.slice(0, 60)}..."`);
    const result = await interviewer.ask(history, DEEPSEEK_API_KEY);

    // Save session
    sessions.set(sessionId, {
      id: sessionId,
      history,
      stage: result.type === 'brief' ? 'research' : 'clarify',
      brief: result.brief || null,
      createdAt: new Date().toISOString(),
    });
    sessionStore.save(sessions.get(sessionId));

    res.json({
      success: true,
      sessionId,
      type: result.type,
      content: result.content,
      brief: result.brief || null,
    });
  } catch (err) {
    next(err);
  }
});

// Stage 1: Continue interview — user responds to a question
app.post('/api/interview/respond', async (req, res, next) => {
  try {
    const { sessionId, answer } = req.body;
    if (!sessionId || !answer) {
      return res.status(400).json({ success: false, error: { message: '缺少 sessionId 或 answer' } });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: { message: '会话不存在或已过期' } });
    }

    // Append user's answer
    session.history.push({ role: 'user', content: answer.trim() });

    console.log(`[Interview] Session ${sessionId}: user responded (${session.history.length} messages)`);
    const result = await interviewer.ask(session.history, DEEPSEEK_API_KEY);

    // Update session
    session.stage = result.type === 'brief' ? 'research' : 'clarify';
    if (result.brief) session.brief = result.brief;
    sessionStore.save(session);

    res.json({
      success: true,
      sessionId,
      type: result.type,
      content: result.content,
      brief: result.brief || null,
      stage: session.stage,
    });
  } catch (err) {
    next(err);
  }
});

// List all sessions (sidebar)
app.get('/api/sessions', (req, res) => {
  try {
    // Merge in-memory sessions (may have newer state) with disk store
    const list = sessionStore.list();
    // Supplement with any in-memory sessions not yet saved
    const diskIds = new Set(list.map(s => s.id));
    for (const [id, session] of sessions) {
      if (!diskIds.has(id)) {
        list.unshift({
          id,
          topic: session.history?.[0]?.content?.slice(0, 50) || '(无标题)',
          stage: session.stage,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt || session.createdAt,
          sourceCount: session.sources?.length || 0,
          hasReport: !!session.reportUrl,
        });
      }
    }
    res.json({ success: true, sessions: list });
  } catch (e) {
    res.json({ success: true, sessions: [] });
  }
});

// Delete a session
app.delete('/api/session/:id', (req, res) => {
  try {
    const { id } = req.params;
    sessions.delete(id);
    sessionStore.remove(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: { message: e.message } });
  }
});

// Get full session state
app.get('/api/session/:id', (req, res) => {
  let session = sessions.get(req.params.id);
  // Fallback to disk
  if (!session) {
    session = sessionStore.load(req.params.id);
  }
  if (!session) {
    return res.status(404).json({ success: false, error: { message: '会话不存在' } });
  }
  res.json({
    success: true,
    session: {
      id: session.id,
      stage: session.stage,
      history: session.history || [],
      brief: session.brief,
      outline: session.outline || null,
      sources: session.sources || null,
      stats: session.stats || null,
      verification: session.verification || null,
      reportUrl: session.reportUrl || null,
      createdAt: session.createdAt,
    },
  });
});

// Stage 2: Execute research with SSE progress
app.post('/api/research', async (req, res, next) => {
  const { sessionId } = req.body;
  const session = sessionId ? sessions.get(sessionId) : null;
  const brief = session?.brief || req.body.brief;

  if (!brief) {
    return res.status(400).json({ success: false, error: { message: '缺少研究纲要。请先完成需求访谈。' } });
  }

  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ success: false, error: { message: 'DeepSeek API Key 未配置' } });
  }

  // SSE stream for progress
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await researcher.research(brief, DEEPSEEK_API_KEY, SEARCH_CONFIG, (progress) => {
      send('progress', progress);
    });

    send('result', { success: true, ...result });

    // Update session
    if (session) {
      session.stage = 'verify';
      session.sources = result.sources;
      session.stats = result.stats;
      sessionStore.save(session);
    }
  } catch (err) {
    send('error', { message: err.message || '研究执行失败' });
  } finally {
    res.end();
  }
});

// Stage 3: Fact check (M4)
app.post('/api/factcheck', async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const session = sessionId ? sessions.get(sessionId) : null;

    if (!session) {
      return res.status(404).json({ success: false, error: { message: '会话不存在或已过期' } });
    }

    if (!session.sources || session.sources.length === 0) {
      return res.status(400).json({ success: false, error: { message: '请先完成研究搜索阶段' } });
    }

    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({ success: false, error: { message: 'DeepSeek API Key 未配置' } });
    }

    console.log(`[FactCheck] Session ${sessionId}: verifying ${session.sources.length} sources...`);
    const result = await factChecker.verify(session.sources, session.brief, DEEPSEEK_API_KEY);

    // Update session
    session.stage = 'generate';
    session.verification = result;
    sessionStore.save(session);

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Stage 4a: Generate report outline
app.post('/api/report/outline', async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const session = sessionId ? sessions.get(sessionId) : null;

    if (!session) {
      return res.status(404).json({ success: false, error: { message: '会话不存在或已过期' } });
    }

    if (!session.brief) {
      return res.status(400).json({ success: false, error: { message: '缺少研究纲要，请先完成需求访谈' } });
    }

    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({ success: false, error: { message: 'DeepSeek API Key 未配置' } });
    }

    console.log(`[Report] Session ${sessionId}: generating outline...`);
    const outline = await reportWriter.generateOutline(
      session.brief,
      session.verification || null,
      DEEPSEEK_API_KEY
    );

    // Store outline in session
    session.outline = outline;
    session.stage = 'generate';
    sessionStore.save(session);

    res.json({ success: true, outline });
  } catch (err) {
    next(err);
  }
});

// Stage 4b: Generate full report with SSE progress
app.post('/api/report/generate', async (req, res, next) => {
  const { sessionId, format } = req.body;
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session) {
    return res.status(404).json({ success: false, error: { message: '会话不存在或已过期' } });
  }

  if (!session.outline) {
    return res.status(400).json({ success: false, error: { message: '请先生成文档大纲' } });
  }

  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ success: false, error: { message: 'DeepSeek API Key 未配置' } });
  }

  const outputFormat = format || 'docx';
  const sources = session.sources || [];
  const brief = session.brief;
  const outline = session.outline;
  const verification = session.verification || null;

  // SSE stream
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const generatedSections = [];
    const totalSections = outline.sections.length;

    for (let i = 0; i < totalSections; i++) {
      const section = outline.sections[i];
      send('progress', {
        phase: 'writing',
        message: `生成章节 (${i + 1}/${totalSections}): ${section.title}`,
      });

      const fullSection = await reportWriter.generateSection(
        section, brief, sources, generatedSections, DEEPSEEK_API_KEY
      );
      generatedSections.push(fullSection);

      send('section', { index: i, title: fullSection.title, content: fullSection.content });
    }

    // Assemble report
    send('progress', { phase: 'assembly', message: '正在编排报告...' });
    const report = reportWriter.assembleReport(outline, generatedSections, sources, verification);

    // Write report JSON
    const reportJsonPath = path.join(__dirname, 'output', `report_${sessionId}.json`);
    fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), 'utf-8');

    // Generate file via Python
    const formatLabel = outputFormat === 'pdf' ? 'PDF（Typst）' : outputFormat.toUpperCase();
    send('progress', { phase: 'file', message: `正在生成 ${formatLabel} 文件...` });

    let pythonScript, outputExt;
    if (outputFormat === 'pdf') {
      pythonScript = 'gen_report_typst.py';
      outputExt = '.pdf';
    } else if (outputFormat === 'pptx') {
      pythonScript = 'gen_report_pptx.py';
      outputExt = '.pptx';
    } else {
      pythonScript = 'gen_report_docx.py';
      outputExt = '.docx';
    }
    const outputPath = path.join(__dirname, 'output', `report_${sessionId}${outputExt}`);
    const pythonPath = path.join(__dirname, 'python', pythonScript);

    const { spawn } = require('child_process');
    await new Promise((resolve, reject) => {
      const proc = spawn('python', [pythonPath, reportJsonPath, outputPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      let stderr = '';
      proc.stderr.on('data', d => stderr += d.toString());
      proc.on('close', code => {
        if (code === 0) resolve();
        else reject(new Error(`Python exited ${code}: ${stderr.slice(0, 200)}`));
      });
      proc.on('error', reject);
    });

    const downloadUrl = `/output/report_${sessionId}${outputExt}`;
    send('complete', {
      success: true,
      downloadUrl,
      format: outputFormat,
      stats: report.meta,
    });

    // Update session
    session.stage = 'done';
    session.reportUrl = downloadUrl;
    sessionStore.save(session);
  } catch (err) {
    send('error', { message: err.message || '报告生成失败' });
  } finally {
    res.end();
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  const status = err.code === 'RATE_LIMITED' ? 429
    : err.code === 'API_ERROR' ? 502
    : 500;
  res.status(status).json({ success: false, error: { message: err.message || '服务器错误' } });
});

app.listen(PORT, () => {
  console.log(`[DeepResearch] Server running at http://localhost:${PORT}`);
  if (!DEEPSEEK_API_KEY) console.warn('[DeepResearch] WARNING: DEEPSEEK_API_KEY not configured!');
});
