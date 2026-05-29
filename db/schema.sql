-- Deep Research Assistant: SQLite Schema

CREATE TABLE IF NOT EXISTS sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL DEFAULT 'Untitled',
  output_type   TEXT NOT NULL CHECK(output_type IN ('report', 'guide')),
  status        TEXT NOT NULL DEFAULT 'clarify' CHECK(status IN ('clarify','research','verify','generate','done')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id    INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content       TEXT NOT NULL,
  stage         TEXT NOT NULL CHECK(stage IN ('clarify','research','verify','generate')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sources (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id    INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  title         TEXT,
  domain        TEXT,
  published_at  TEXT,
  credibility   TEXT CHECK(credibility IN ('A','B','C')),
  freshness     TEXT CHECK(freshness IN ('green','yellow','red')),
  content       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fact_checks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id    INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  claim         TEXT NOT NULL,
  verdict       TEXT NOT NULL CHECK(verdict IN ('verified','single_source','disputed','unverified')),
  source_ids    TEXT,
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id    INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  format        TEXT NOT NULL CHECK(format IN ('pptx','docx')),
  file_path     TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
