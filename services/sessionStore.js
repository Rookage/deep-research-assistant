const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'db', 'sessions');

// Ensure sessions directory
fs.mkdirSync(DB_DIR, { recursive: true });

function sessionPath(id) {
  return path.join(DB_DIR, `${id}.json`);
}

function save(session) {
  // Serialize safely — strip circular refs and limit depth
  const data = {
    id: session.id,
    history: session.history || [],
    stage: session.stage || 'clarify',
    brief: session.brief || null,
    outline: session.outline || null,
    sources: session.sources || null,
    stats: session.stats || null,
    verification: session.verification || null,
    reportUrl: session.reportUrl || null,
    createdAt: session.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const p = sessionPath(session.id);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  return session.id;
}

function load(id) {
  const p = sessionPath(id);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

function list() {
  if (!fs.existsSync(DB_DIR)) return [];
  const files = fs.readdirSync(DB_DIR).filter(f => f.endsWith('.json'));
  const sessions = [];
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DB_DIR, f), 'utf-8'));
      sessions.push({
        id: data.id,
        topic: data.history?.[0]?.content?.slice(0, 50) || '(无标题)',
        stage: data.stage,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        sourceCount: data.sources?.length || 0,
        hasReport: !!data.reportUrl,
      });
    } catch {
      // skip corrupt files
    }
  }
  // Sort newest first
  sessions.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  return sessions;
}

function remove(id) {
  const p = sessionPath(id);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

module.exports = { save, load, list, remove };
