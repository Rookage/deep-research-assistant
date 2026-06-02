# AI Deep Research Assistant

Turn vague ideas into academic-grade research reports — powered by Stanford STORM methodology.

## What This Project Does

A 4-stage pipeline for deep, verifiable research:
1. **Clarify + Perspective Discovery** — Structured interview (10–15 rounds) + STORM-inspired multi-perspective analysis (3–5 viewpoints)
2. **Multi-Perspective Deep Search** — Baidu + Bing, per-perspective 3-round simulated expert dialogue
3. **Fact Verification** — AI extracts key claims, cross-references ≥2 independent sources, labels verified/single-source/disputed
4. **Academic-Grade Report** — Typst PDF (cover + TOC + pagination + citations + methodology + limitations) / DOCX / PPTX, with 🔄 dynamic supplement loop

## Project Structure

```
deep-research-assistant/
├── server.js                    # Express backend, port 3001
├── services/
│   ├── interviewer.js           # Stage 1: Clarify + brief generation
│   ├── perspectiveEngine.js     # Stage 1.5: STORM multi-perspective discovery
│   ├── researcher.js            # Stage 2: Search + content fetch + annotation
│   ├── factChecker.js           # Stage 3: Claim extraction + cross-verification
│   ├── reportWriter.js          # Stage 4: Outline + section generation + assembly
│   └── sessionStore.js          # JSON file persistence
├── python/
│   ├── gen_report_typst.py      # Typst PDF generation
│   ├── gen_report_docx.py       # DOCX generation
│   ├── gen_report_pptx.py       # PPTX generation
│   ├── gen_charts.py            # ECharts + Mermaid chart generation
│   ├── scrapling_fetch.py       # httpx+lxml content fetcher
│   └── report_template.typ      # Typst academic template
├── public/                      # Vanilla HTML/CSS/JS frontend
└── .env.example                 # DEEPSEEK_API_KEY, PORT
```

## Available API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/interview/start` | POST | Start research interview `{ topic }` |
| `/api/interview/respond` | POST | Continue interview `{ sessionId, answer }` |
| `/api/perspectives` | POST | Discover multi-perspective viewpoints `{ sessionId }` |
| `/api/research` | POST (SSE) | Execute deep search `{ sessionId }` |
| `/api/factcheck` | POST | Verify key claims `{ sessionId }` |
| `/api/report/outline` | POST | Generate report outline `{ sessionId }` |
| `/api/report/generate` | POST (SSE) | Generate full report `{ sessionId, format }` (pdf/docx/pptx) |
| `/api/supplement` | POST (SSE) | Add supplemental links `{ sessionId, urls }` |
| `/api/sessions` | GET | List all sessions |
| `/api/session/:id` | GET/DELETE | Get or delete a session |

## Quick Start

```bash
cd deep-research-assistant
npm install
pip install httpx lxml python-docx python-pptx

# Install Typst
choco install typst     # Windows
brew install typst       # macOS

cp .env.example .env     # Add DEEPSEEK_API_KEY
npm start                # http://localhost:3001
```

## Common Issues

- **401 "AI服务器返回错误"**: DeepSeek API key is invalid or expired. Update in `.env`
- **Typst compilation fails**: Make sure `typst` CLI is installed and in PATH. Windows: use `choco install typst`
- **GBK encoding errors**: Python subprocesses need `PYTHONIOENCODING=utf-8` + `PYTHONUTF8=1`
- **Font warnings**: Typst template uses Windows default fonts (SimSun, SimHei, Microsoft YaHei). On macOS/Linux, install CJK fonts or update the template
- **"env (0)" on startup**: Server must be started from the project directory so `dotenv` finds `.env`
- **GitHub API blocked**: Use `curl` or `gh` CLI with token instead of WebFetch
