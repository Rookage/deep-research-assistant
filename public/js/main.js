(function () {
  // DOM refs
  const emptyState = document.getElementById('emptyState');
  const activeSession = document.getElementById('activeSession');
  const topicInput = document.getElementById('topicInput');
  const startBtn = document.getElementById('startBtn');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const conversation = document.getElementById('conversation');
  const actionBar = document.getElementById('actionBar');
  const proceedBtn = document.getElementById('proceedBtn');
  const reviseBtn = document.getElementById('reviseBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const stageIndicator = document.getElementById('stageIndicator');
  const sessionTitle = document.getElementById('sessionTitle');
  const sessionList = document.getElementById('sessionList');
  const newSessionBtn = document.getElementById('newSessionBtn');
  const inputArea = document.getElementById('inputArea');

  // State
  let currentSessionId = null;
  let currentBrief = null;
  let currentStage = 'clarify';
  let currentStats = null;
  let currentPerspectives = null;

  // ============ UI Helpers ============
  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = 'message ' + role;
    div.innerHTML = `
      <div class="message-avatar">${role === 'user' ? 'U' : 'AI'}</div>
      <div class="message-bubble">${content.replace(/\n/g, '<br>')}</div>
    `;
    conversation.appendChild(div);
    conversation.scrollTop = conversation.scrollHeight;
    return div;
  }

  function addSystemMessage(content) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `
      <div class="message-avatar" style="background:#f0f0f0;color:#666;">i</div>
      <div class="message-bubble" style="background:#f9f9f9;color:#666;font-size:13px;">${content}</div>
    `;
    conversation.appendChild(div);
    conversation.scrollTop = conversation.scrollHeight;
    return div;
  }

  function addBriefCard(brief) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `
      <div class="message-avatar">AI</div>
      <div class="message-bubble">
        <div class="research-brief">
          <h3>研究纲要</h3>
          <div class="research-brief-section">
            <div class="research-brief-label">核心问题</div>
            <div class="research-brief-content">${escHtml(brief.coreQuestion)}</div>
          </div>
          <div class="research-brief-section">
            <div class="research-brief-label">输出类型</div>
            <div class="research-brief-content">${brief.outputType === 'guide' ? '执行指南' : '深度报告'}</div>
          </div>
          <div class="research-brief-section">
            <div class="research-brief-label">子问题</div>
            <div class="research-brief-content">
              ${(brief.subQuestions || []).map(function (q, i) { return (i + 1) + '. ' + escHtml(q); }).join('<br>')}
            </div>
          </div>
          <div class="research-brief-section">
            <div class="research-brief-label">预期信源</div>
            <div class="research-brief-content">${(brief.expectedSources || []).join('、')}</div>
          </div>
          <div class="research-brief-section">
            <div class="research-brief-label">预估成本</div>
            <div class="research-brief-content">约 ${brief.estimatedSearches || '?'} 次搜索，~${brief.estimatedTokens || '?'} tokens</div>
          </div>
        </div>
      </div>
    `;
    conversation.appendChild(div);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function addSourceCard(source) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    const cBadge = source.credibility === 'A' ? 'badge-a' : source.credibility === 'C' ? 'badge-c' : 'badge-b';
    const fBadge = source.freshness === 'green' ? 'badge-green'
      : source.freshness === 'yellow' ? 'badge-yellow'
      : source.freshness === 'red' ? 'badge-red' : '';
    div.innerHTML = `
      <div class="message-avatar">S</div>
      <div class="message-bubble">
        <div class="source-card">
          <strong>${escHtml(source.title)}</strong>
          <div class="source-url">${escHtml(source.url)}</div>
          <div class="source-meta">
            <span class="badge ${cBadge}">信源${source.credibility}级</span>
            ${source.freshness !== 'unknown' ? `<span class="badge ${fBadge}">${source.freshness === 'green' ? '有效' : source.freshness === 'yellow' ? '偏旧' : '过时'}</span>` : ''}
            ${source.publishedAt ? '<span>' + source.publishedAt + '</span>' : ''}
          </div>
          ${source.snippet ? '<div style="margin-top:6px;color:#666;font-size:12px;">' + escHtml(source.snippet.slice(0, 200)) + '</div>' : ''}
        </div>
      </div>
    `;
    conversation.appendChild(div);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function addStatsCard(stats) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `
      <div class="message-avatar">AI</div>
      <div class="message-bubble">
        <div class="research-brief">
          <h3>素材采集完成</h3>
          <div class="research-brief-content">
            共找到 <strong>${stats.totalSources}</strong> 条来源<br>
            信源质量：A级 ${stats.credibility.A || 0} · B级 ${stats.credibility.B || 0} · C级 ${stats.credibility.C || 0}<br>
            时效性：有效 ${stats.freshness.green || 0} · 偏旧 ${stats.freshness.yellow || 0} · 过时 ${stats.freshness.red || 0} · 未知 ${stats.freshness.unknown || 0}
          </div>
        </div>
      </div>
    `;
    conversation.appendChild(div);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function addVerificationCard(claim, index) {
    const vBadge = claim.verification === 'verified' ? 'badge-green'
      : claim.verification === 'disputed' ? 'badge-red'
      : 'badge-yellow';
    const vLabel = claim.verification === 'verified' ? '已验证'
      : claim.verification === 'disputed' ? '存在争议'
      : '单一来源';
    const cLabel = claim.confidence === 'high' ? '高置信'
      : claim.confidence === 'medium' ? '中置信' : '低置信';
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `
      <div class="message-avatar">V</div>
      <div class="message-bubble">
        <div class="source-card">
          <div class="source-meta" style="margin-bottom:6px;">
            <span class="badge ${vBadge}">${vLabel}</span>
            <span class="badge">${cLabel}</span>
            <span style="margin-left:auto;color:#999;font-size:11px;">#${index + 1}</span>
          </div>
          <div style="margin-bottom:6px;line-height:1.5;">${escHtml(claim.claim)}</div>
          ${claim.supportingSources && claim.supportingSources.length ? '<div style="font-size:11px;color:#999;">来源：' + claim.supportingSources.map(function(u) { return '<a href="' + escHtml(u) + '" target="_blank" style="color:#2563eb;">' + escHtml(u.replace(/^https?:\/\//, '').replace(/\/.*/, '')).slice(0, 30) + '</a>'; }).join(' · ') + '</div>' : ''}
          ${claim.conflictingSources && claim.conflictingSources.length ? '<div style="font-size:11px;color:#e53e3e;">冲突来源：' + claim.conflictingSources.map(function(u) { return escHtml(u); }).join(' · ') + '</div>' : ''}
        </div>
      </div>
    `;
    conversation.appendChild(div);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function addVerificationSummary(summary, stats) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `
      <div class="message-avatar">AI</div>
      <div class="message-bubble">
        <div class="research-brief">
          <h3>事实核查完成</h3>
          <div class="research-brief-content">
            共识别 <strong>${stats.totalClaims}</strong> 条关键主张<br>
            <span style="color:#38a169;">已验证 ${stats.verified}</span> ·
            <span style="color:#d69e2e;">单一来源 ${stats.singleSource}</span> ·
            <span style="color:#e53e3e;">存在争议 ${stats.disputed}</span>
          </div>
          ${summary ? '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #eee;color:#666;font-size:13px;">' + escHtml(summary) + '</div>' : ''}
        </div>
      </div>
    `;
    conversation.appendChild(div);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function updateStageIndicator(stage) {
    currentStage = stage;
    const stages = ['clarify', 'research', 'verify', 'generate'];
    const idx = stages.indexOf(stage);
    const dots = stageIndicator.querySelectorAll('.stage-dot');
    dots.forEach(function (dot, i) {
      dot.classList.remove('active', 'done');
      if (i === idx) dot.classList.add('active');
      else if (i < idx) dot.classList.add('done');
    });

    // Show/hide interview progress and clarify banner
    var progressEl = document.getElementById('interviewProgress');
    var bannerEl = document.getElementById('clarifyBanner');
    if (stage === 'clarify') {
      if (progressEl) show(progressEl);
      if (bannerEl) show(bannerEl);
    } else {
      if (progressEl) hide(progressEl);
      if (bannerEl) hide(bannerEl);
    }
  }

  function updateInterviewProgress(roundCount) {
    var progressEl = document.getElementById('interviewProgress');
    var barFill = document.getElementById('progressBarFill');
    var label = document.getElementById('progressLabel');
    if (!progressEl || !barFill || !label) return;

    show(progressEl);

    // 15 rounds max for progress bar, round 15 = 100%
    var maxRounds = 15;
    var pct = Math.min((roundCount / maxRounds) * 100, 100);
    barFill.style.width = pct + '%';

    if (roundCount < maxRounds) {
      label.textContent = '第 ' + roundCount + ' 轮 · 预计还需 ' + (maxRounds - roundCount) + ' 轮';
    } else {
      label.textContent = '第 ' + roundCount + ' 轮 · 接近完成';
    }
  }

  function setInputEnabled(enabled) {
    messageInput.disabled = !enabled;
    sendBtn.disabled = !enabled;
    if (!enabled) { hide(inputArea); } else { show(inputArea); }
  }

  function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 3000);
  }

  function setBtnLoading(btn, loading) {
    btn.disabled = loading;
    if (loading) {
      btn.dataset.origText = btn.textContent;
      btn.textContent = '...';
    } else {
      btn.textContent = btn.dataset.origText || btn.textContent;
    }
  }

  function setActionBar(mode) {
    // mode: 'brief' | 'research' | 'hidden'
    if (mode === 'hidden') {
      hide(actionBar);
      return;
    }
    show(actionBar);
    proceedBtn.classList.remove('hidden');
    reviseBtn.classList.remove('hidden');
    cancelBtn.classList.remove('hidden');

    if (mode === 'brief') {
      proceedBtn.textContent = '发现研究视角 🔍';
      reviseBtn.textContent = '直接搜索';
      proceedBtn.onclick = handleDiscoverPerspectives;
      reviseBtn.onclick = handleStartResearch;
      cancelBtn.onclick = handleReviseBrief;
      cancelBtn.textContent = '修改纲要';
    } else if (mode === 'perspectives') {
      proceedBtn.textContent = '确认视角，深度搜索 →';
      reviseBtn.textContent = '重新发现';
      proceedBtn.onclick = function() { handleStartResearch(); };
      reviseBtn.onclick = handleDiscoverPerspectives;
      cancelBtn.onclick = handleReviseBrief;
      cancelBtn.textContent = '修改纲要';
    } else if (mode === 'research') {
      proceedBtn.textContent = '确认素材，开始核查 →';
      reviseBtn.textContent = '补充更多来源';
      proceedBtn.onclick = handleProceedToVerify;
      reviseBtn.onclick = handleReviseResearch;
    } else if (mode === 'verify') {
      proceedBtn.textContent = '确认核查，生成报告 →';
      reviseBtn.textContent = '补充核查';
      proceedBtn.onclick = handleProceedToGenerate;
      reviseBtn.onclick = handleReviseVerification;
    } else if (mode === 'outline') {
      proceedBtn.style.background = '#dc2626';
      proceedBtn.textContent = '生成精美 PDF（推荐）';
      reviseBtn.textContent = '生成 DOCX';
      cancelBtn.textContent = '生成 PPTX';
      proceedBtn.onclick = function() { handleConfirmGenerate('pdf'); };
      reviseBtn.onclick = function() { handleConfirmGenerate('docx'); };
      cancelBtn.onclick = function() { handleConfirmGenerate('pptx'); };
    }
  }

  // ============ API Calls ============

  async function startInterview(topic) {
    const res = await fetch('/api/interview/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error.message);
    return data;
  }

  async function respondToInterview(sessionId, answer) {
    const res = await fetch('/api/interview/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, answer }),
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error.message);
    return data;
  }

  async function executeResearch(sessionId, brief) {
    // Use fetch with streaming for SSE
    const res = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, brief }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (eventType === 'progress') {
            addSystemMessage(data.message);
          } else if (eventType === 'result') {
            result = data;
          } else if (eventType === 'error') {
            throw new Error(data.message);
          }
        }
      }
    }

    if (!result) throw new Error('研究未返回结果');
    return result;
  }

  // ============ Session Management ============

  async function handleStart() {
    var topic = topicInput.value.trim();
    if (!topic) { showToast('请输入一个你想研究的问题', 'error'); return; }

    console.log('[DRA] Starting interview:', topic.slice(0, 40));
    hide(emptyState);
    show(activeSession);
    conversation.innerHTML = '';
    currentBrief = null;
    currentStats = null;
    currentSessionId = null;
    hide(actionBar);
    updateStageIndicator('clarify');

    sessionTitle.textContent = topic.length > 50 ? topic.slice(0, 50) + '...' : topic;
    addMessage('user', topic);

    setBtnLoading(startBtn, true);
    setInputEnabled(false);

    try {
      var data = await startInterview(topic);
      currentSessionId = data.sessionId;
      console.log('[DRA] Session created:', currentSessionId);
      addMessage('assistant', data.content);
      updateInterviewProgress(1);

      if (data.type === 'brief') {
        currentBrief = data.brief;
        addBriefCard(data.brief);
        setActionBar('brief');
        updateStageIndicator('research');
      } else {
        setInputEnabled(true);
        messageInput.focus();
      }
    } catch (err) {
      console.error('[DRA] Start error:', err.message);
      showToast(err.message || '启动失败，请检查服务器连接', 'error');
      hide(activeSession);
      show(emptyState);
    } finally {
      setBtnLoading(startBtn, false);
    }
  }

  async function handleSend() {
    var msg = messageInput.value.trim();
    if (!msg) return;
    if (!currentSessionId) {
      showToast('会话已过期，请重新开始研究', 'error');
      handleCancel();
      return;
    }

    console.log('[DRA] Sending:', msg.slice(0, 40));
    addMessage('user', msg);
    messageInput.value = '';
    setInputEnabled(false);

    try {
      var data = await respondToInterview(currentSessionId, msg);
      console.log('[DRA] Response type:', data.type);
      addMessage('assistant', data.content);

      // Calculate round count: (history messages) / 2
      // 1 initial topic + N responses = total user messages
      var roundEstimate = 0;
      try {
        var sessRes = await fetch('/api/session/' + currentSessionId);
        var sessData = await sessRes.json();
        if (sessData.success) {
          roundEstimate = Math.ceil((sessData.session.history || []).filter(function(h) { return h.role === 'user'; }).length);
        }
      } catch(e) {}
      if (roundEstimate > 0) updateInterviewProgress(roundEstimate);

      if (data.type === 'brief') {
        currentBrief = data.brief;
        addBriefCard(data.brief);
        setActionBar('brief');
        updateStageIndicator('research');
      } else {
        setInputEnabled(true);
        messageInput.focus();
      }
    } catch (err) {
      console.error('[DRA] Send error:', err.message);
      showToast(err.message || '请求失败', 'error');
      setInputEnabled(true);
    }
  }

  function handleReviseBrief() {
    setInputEnabled(true);
    hide(actionBar);
    currentBrief = null;
    updateStageIndicator('clarify');
    messageInput.placeholder = '请说明需要修改什么...';
    messageInput.focus();
  }

  // ============ Perspective Discovery (STORM-inspired) ============

  function addPerspectivesCard(perspectives, crossCuttingThemes) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    var perspectivesHtml = (perspectives || []).map(function(p, i) {
      return '<div class="perspective-item">' +
        '<div class="perspective-name">' + (i + 1) + '. ' + escHtml(p.name) + '</div>' +
        '<div class="perspective-rationale">' + escHtml(p.rationale) + '</div>' +
        '<div class="perspective-questions">' + (p.coreQuestions || []).map(function(q) { return '<span class="question-tag">' + escHtml(q) + '</span>'; }).join('') + '</div>' +
        '</div>';
    }).join('');

    var themesHtml = '';
    if (crossCuttingThemes && crossCuttingThemes.length > 0) {
      themesHtml = '<div class="cross-cutting-themes"><strong>贯穿主题：</strong>' +
        crossCuttingThemes.map(function(t) { return '<span class="theme-tag">' + escHtml(t) + '</span>'; }).join(' ') +
        '</div>';
    }

    div.innerHTML = `
      <div class="message-avatar">AI</div>
      <div class="message-bubble">
        <div class="research-brief">
          <h3>🔍 多视角研究框架</h3>
          <p style="color:#666;font-size:13px;margin-bottom:12px;">AI 自动发现 ${perspectives.length} 个研究视角，帮助深度探索主题</p>
          ${perspectivesHtml}
          ${themesHtml}
        </div>
      </div>
    `;
    conversation.appendChild(div);
    conversation.scrollTop = conversation.scrollHeight;
  }

  async function handleDiscoverPerspectives() {
    if (!currentSessionId) return;
    hide(actionBar);
    setInputEnabled(false);
    addSystemMessage('正在发现多元研究视角...');

    try {
      var res = await fetch('/api/perspectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId }),
      });
      var data = await res.json();
      if (!data.success) throw new Error(data.error.message);

      addPerspectivesCard(data.perspectives, data.crossCuttingThemes);
      currentPerspectives = data.perspectives;
      setActionBar('perspectives');
    } catch (err) {
      showToast(err.message || '视角发现失败', 'error');
      setActionBar('brief');
    }
  }

  async function handleStartResearch() {
    if (!currentBrief) return;
    hide(actionBar);
    setInputEnabled(false);
    updateStageIndicator('research');
    addSystemMessage('开始多源搜索...');

    try {
      var data = await executeResearch(currentSessionId, currentBrief);

      // Show stats
      currentStats = data.stats;
      addStatsCard(data.stats);

      // Show source cards
      for (var i = 0; i < data.sources.length; i++) {
        addSourceCard(data.sources[i]);
        // Small delay for visual effect
        if (i % 3 === 2) await new Promise(function (r) { setTimeout(r, 100); });
      }

      setActionBar('research');
      updateStageIndicator('verify');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function executeFactCheck(sessionId) {
    const res = await fetch('/api/factcheck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error.message);
    return data;
  }

  async function handleProceedToVerify() {
    if (!currentSessionId) return;
    hide(actionBar);
    setInputEnabled(false);
    updateStageIndicator('verify');
    addSystemMessage('正在进行事实核查...');

    try {
      var data = await executeFactCheck(currentSessionId);

      // Show summary
      addVerificationSummary(data.summary, data.stats);

      // Show each claim
      for (var i = 0; i < data.claims.length; i++) {
        addVerificationCard(data.claims[i], i);
        if (i % 3 === 2) await new Promise(function (r) { setTimeout(r, 50); });
      }

      setActionBar('verify');
      updateStageIndicator('generate');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function handleReviseResearch() {
    showToast('补充搜索功能将在 M3+ 实现', '');
  }

  // ============ Stage 4: Report Generation ============

  async function executeReportOutline(sessionId) {
    const res = await fetch('/api/report/outline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error.message);
    return data.outline;
  }

  async function executeReportGenerate(sessionId, format) {
    const res = await fetch('/api/report/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, format }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (eventType === 'progress') {
            addSystemMessage(data.message);
          } else if (eventType === 'section') {
            addSectionPreview(data);
          } else if (eventType === 'complete') {
            result = data;
          } else if (eventType === 'error') {
            throw new Error(data.message);
          }
        }
      }
    }

    if (!result) throw new Error('报告生成未返回结果');
    return result;
  }

  function addOutlineCard(outline) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `
      <div class="message-avatar">AI</div>
      <div class="message-bubble">
        <div class="research-brief">
          <h3>文档大纲 · ${escHtml(outline.type || '深度报告')}</h3>
          <div style="font-size:15px;font-weight:600;margin-bottom:12px;color:#1e293b;">${escHtml(outline.title)}</div>
          ${(outline.sections || []).map(function(s, i) {
            return '<div class="research-brief-section"><div class="research-brief-label">' + (i + 1) + '. ' + escHtml(s.title) + '</div><div class="research-brief-content">' + (s.keyPoints || []).map(function(kp) { return '&bull; ' + escHtml(kp); }).join('<br>') + '</div></div>';
          }).join('')}
          <div class="research-brief-section">
            <div class="research-brief-label">预估消耗</div>
            <div class="research-brief-content">约 ${outline.estimatedTokens || '?'} tokens</div>
          </div>
        </div>
      </div>
    `;
    conversation.appendChild(div);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function addSectionPreview(data) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    const preview = (data.content || '').replace(/<[^>]*>/g, '').slice(0, 200);
    div.innerHTML = `
      <div class="message-avatar">S</div>
      <div class="message-bubble">
        <strong>${escHtml(data.title)}</strong>
        <div style="margin-top:6px;color:#666;font-size:12px;">${escHtml(preview)}...</div>
      </div>
    `;
    conversation.appendChild(div);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function addDownloadCard(result) {
    var ext = result.format === 'pptx' ? 'PPTX' : 'DOCX';
    var icon = result.format === 'pptx' ? '' : '';
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `
      <div class="message-avatar">AI</div>
      <div class="message-bubble">
        <div class="research-brief" style="text-align:center;">
          <h3>报告生成完成</h3>
          <div class="research-brief-content">
            已生成 ${result.stats.citedCount || '?'} 条引用 · ${result.stats.verifiedClaims || 0} 条已验证主张
          </div>
          <a href="${escHtml(result.downloadUrl)}" download class="btn-primary" style="display:inline-block;margin-top:12px;text-decoration:none;padding:10px 24px;">下载 ${ext} 文件</a>
        </div>
      </div>
    `;
    conversation.appendChild(div);
    conversation.scrollTop = conversation.scrollHeight;
  }

  async function handleProceedToGenerate() {
    if (!currentSessionId) return;
    hide(actionBar);
    setInputEnabled(false);
    updateStageIndicator('generate');
    addSystemMessage('正在生成文档大纲...');

    try {
      var outline = await executeReportOutline(currentSessionId);
      addOutlineCard(outline);
      setActionBar('outline');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleConfirmGenerate(format) {
    if (!currentSessionId) return;
    hide(actionBar);
    setInputEnabled(false);
    var formatLabel = format === 'pptx' ? 'PPTX' : 'DOCX';
    addSystemMessage('开始逐节生成报告（' + formatLabel + '格式）...');

    try {
      var result = await executeReportGenerate(currentSessionId, format);
      addDownloadCard(result);
      hide(actionBar);
      updateStageIndicator('generate');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function handleReviseOutline() {
    showToast('重新生成大纲功能将在 M5+ 实现', '');
  }

  function handleReviseVerification() {
    showToast('补充核查功能将在 M4+ 实现', '');
  }

  function handleCancel() {
    hide(activeSession);
    show(emptyState);
    conversation.innerHTML = '';
    currentSessionId = null;
    currentBrief = null;
    currentStats = null;
    hide(actionBar);
    updateStageIndicator('clarify');
    topicInput.value = '';
    topicInput.focus();
    loadSessionList();
  }

  // ============ Session History ============

  async function loadSessionList() {
    try {
      var res = await fetch('/api/sessions');
      var data = await res.json();
      renderSessionList(data.sessions || []);
    } catch (e) {
      // silent fail — session list is non-critical
    }
  }

  function renderSessionList(sessions) {
    sessionList.innerHTML = '';
    if (sessions.length === 0) {
      sessionList.innerHTML = '<div class="session-list-empty">暂无历史记录</div>';
      return;
    }
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      var stageLabel = s.stage === 'done' ? '已完成' : s.stage === 'generate' ? '文档生成' : s.stage === 'verify' ? '核查中' : s.stage === 'research' ? '搜索中' : '澄清中';
      var div = document.createElement('div');
      div.className = 'session-item';
      div.dataset.id = s.id;
      div.innerHTML = '<span class="session-item-topic">' + escHtml(s.topic) + '</span><span class="session-item-meta">' + stageLabel + ' · ' + (s.createdAt || '').slice(0, 10) + (s.hasReport ? ' · ' : '') + '</span><button class="session-item-delete" data-id="' + s.id + '" title="删除">×</button>';
      div.querySelector('.session-item-delete').addEventListener('click', function(e) {
        e.stopPropagation();
        deleteSession(this.dataset.id);
      });
      div.addEventListener('click', function() { resumeSession(this.dataset.id); });
      sessionList.appendChild(div);
    }
  }

  async function deleteSession(sessionId) {
    if (!confirm('确定删除这个研究记录吗？此操作不可恢复。')) return;
    try {
      var res = await fetch('/api/session/' + sessionId, { method: 'DELETE' });
      var data = await res.json();
      if (!data.success) { showToast(data.error.message, 'error'); return; }
      showToast('已删除');
      if (currentSessionId === sessionId) handleCancel();
      loadSessionList();
    } catch (e) {
      showToast('删除失败', 'error');
    }
  }

  async function resumeSession(sessionId) {
    try {
      var res = await fetch('/api/session/' + sessionId);
      var data = await res.json();
      if (!data.success) { showToast(data.error.message, 'error'); return; }
      var session = data.session;

      // Reset UI
      hide(emptyState);
      show(activeSession);
      conversation.innerHTML = '';
      hide(actionBar);
      setInputEnabled(false);

      currentSessionId = session.id;
      currentBrief = session.brief;
      currentStats = session.stats;

      // Set title from first user message
      var firstMsg = (session.history || []).find(function(h) { return h.role === 'user'; });
      sessionTitle.textContent = firstMsg ? (firstMsg.content.length > 50 ? firstMsg.content.slice(0, 50) + '...' : firstMsg.content) : '(无标题)';

      // Render all messages from history
      for (var i = 0; i < (session.history || []).length; i++) {
        var msg = session.history[i];
        if (msg.role === 'user') {
          addMessage('user', msg.content);
        } else if (msg.role === 'assistant') {
          addMessage('assistant', msg.content);
        }
      }

      // Render brief if exists
      if (session.brief) {
        addBriefCard(session.brief);
      }

      // Render sources if exists
      if (session.sources && session.sources.length > 0) {
        addStatsCard(session.stats || { totalSources: session.sources.length, credibility: {}, freshness: {} });
        for (var j = 0; j < session.sources.length; j++) {
          addSourceCard(session.sources[j]);
        }
      }

      // Render verification if exists
      if (session.verification) {
        addVerificationSummary(session.verification.summary, session.verification.stats);
        for (var k = 0; k < (session.verification.claims || []).length; k++) {
          addVerificationCard(session.verification.claims[k], k);
        }
      }

      // Render outline if exists
      if (session.outline) {
        addOutlineCard(session.outline);
      }

      // Render download if report exists
      if (session.reportUrl) {
        addDownloadCard({ downloadUrl: session.reportUrl, format: session.reportUrl.endsWith('pptx') ? 'pptx' : 'docx', stats: {} });
      }

      // Update stage indicator
      updateStageIndicator(session.stage === 'done' ? 'generate' : session.stage);

      // Show appropriate action bar
      if (session.stage === 'research' || session.stage === 'clarify') {
        // no action bar needed
      } else if (session.stage === 'verify') {
        setActionBar('research');
      } else if (session.stage === 'generate' && !session.outline) {
        setActionBar('verify');
      } else if (session.stage === 'generate' && session.outline) {
        setActionBar('outline');
      }

    } catch (e) {
      showToast('加载会话失败: ' + e.message, 'error');
    }
  }

  // ============ Event Handlers ============

  startBtn.addEventListener('click', handleStart);

  topicInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); handleStart(); }
  });

  sendBtn.addEventListener('click', handleSend);

  messageInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); handleSend(); }
  });

  cancelBtn.addEventListener('click', handleCancel);
  newSessionBtn.addEventListener('click', handleCancel);

  // ============ Init ============
  loadSessionList();
  console.log('[DRA] Deep Research Assistant v0.4.0 ready');
})();
