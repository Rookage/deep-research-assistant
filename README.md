<p align="center">
  <img src="https://img.shields.io/badge/version-0.5.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/Node.js-16%2B-brightgreen" alt="Node">
  <img src="https://img.shields.io/badge/Python-3.8%2B-blue" alt="Python">
  <img src="https://img.shields.io/badge/AI-DeepSeek-blueviolet" alt="DeepSeek">
  <img src="https://img.shields.io/badge/PDF-Typst-orange" alt="Typst">
  <img src="https://img.shields.io/badge/methodology-STORM-red" alt="STORM">
</p>

<h1 align="center">AI Deep Research Assistant</h1>
<h3 align="center">Vague Idea → Multi-Perspective Research → Academic-Grade Report</h3>

<p align="center">
  <b>Not just search — real research.</b><br>
  Stanford STORM methodology · Multi-perspective analysis · Simulated expert dialogue · Fact verification
</p>

---

<p align="center">
  <a href="#english">English</a> | <a href="#chinese">中文</a>
</p>

---

<h2 id="english">🇬🇧 English</h2>

### Why This Exists

| Traditional Workflow | This Tool |
|------|------|
| Manual Google → copy/paste → write yourself | AI clarifies your needs → deep multi-perspective search → auto-generation |
| Single viewpoint | 🆕 **3–5 perspectives** (policy/market/tech/social/international) |
| Text-only reports, no visuals | 🆕 **ECharts charts + Mermaid diagrams** |
| One-shot generation, can't update | 🆕 **Dynamic supplement loop**: paste links → integrate → regenerate |
| Ugly Word formatting | **Typst academic-grade PDF**: cover + TOC + pagination + citations |

### Features

- 🎯 **Smart Requirement Clarification** — 4-dimension structured interview. ~10–15 rounds, with a progress bar so users know what to expect.
- 🔍 **STORM Multi-Perspective Search** — Inspired by the Stanford paper. Discovers 3–5 viewpoints, each explored in depth.
- 💬 **Simulated Expert Dialogue** — 3 rounds per perspective: initial search → follow-up → deep dive.
- ✅ **Fact Verification** — AI extracts key claims, cross-references ≥2 independent sources, labels "verified / single-source / disputed".
- 📊 **Auto Chart Generation** — ECharts for data + Mermaid for flowcharts/timelines.
- 📄 **Academic-Grade PDF** — Typst engine: cover, TOC, pagination, citations, methodology section, limitations disclosure.
- 🔄 **Dynamic Supplement Loop** — After generation, paste new links → auto-fetch → merge → regenerate. Repeat as needed.
- 💾 **Session Persistence** — Save, list, delete, resume research sessions anytime.

### Quick Start

**Prerequisites:** Node.js 16+, Python 3.8+, Typst v0.14+, DeepSeek API Key

```bash
git clone https://github.com/Rookage/deep-research-assistant.git
cd deep-research-assistant
npm install
pip install httpx lxml python-docx python-pptx

# Install Typst
choco install typst        # Windows
brew install typst          # macOS

cp .env.example .env        # Add your DeepSeek key
npm start                   # http://localhost:3001
```

### Architecture

```
Vague Idea
    │
    ▼
┌──────────────────────────┐
│ Stage 1: Clarify + Views  │  ← DeepSeek + STORM
│ Interview → Brief → 3–5   │
│ research perspectives     │
└────────┬─────────────────┘
         │ ✅ User confirms
         ▼
┌──────────────────────────┐
│ Stage 2: Deep Search      │  ← Baidu + Bing + httpx/lxml
│ Per-perspective 3-round   │
│ expert dialogue           │
└────────┬─────────────────┘
         │ ✅ User confirms
         ▼
┌──────────────────────────┐
│ Stage 3: Fact Check       │
│ AI extracts claims →      │
│ cross-verify → label      │
└────────┬─────────────────┘
         │ ✅ User confirms
         ▼
┌──────────────────────────┐
│ Stage 4: Report Generation│  ← Typst PDF / DOCX / PPTX
│ Outline → sections+charts │
│ → polish → download       │
│ 🔄 Supplement Loop        │
└──────────────────────────┘
```

### Tech Stack

| Layer | Tech |
|----|------|
| Backend | Node.js + Express |
| AI | DeepSeek API |
| Search | Baidu + Bing |
| PDF | Typst v0.14.2 |
| Office | python-docx + python-pptx |
| Charts | ECharts + Mermaid |
| Content Fetch | httpx + lxml (Python) |
| Frontend | Vanilla HTML/CSS/JS |
| Methodology | Stanford STORM |

### License

MIT

---

<h2 id="chinese">🇨🇳 中文</h2>

### 为什么你需要这个工具？

| 传统做法 | 本工具 |
|------|------|
| 手动 Google → 复制粘贴 → 自己写 | AI 自动追问澄清需求 → 多视角深度搜索 → 自动生成 |
| 只看一个角度的信息 | 🆕 **3-5 个视角**（政策/市场/技术/社会/国际） |
| 报告只有字，没有图 | 🆕 **ECharts 图表 + Mermaid 流程图** |
| 生成完就不能改了 | 🆕 **动态补充 Loop**：贴链接 → 整合 → 再生 |
| Word 排版惨不忍睹 | **Typst 学术级 PDF**：封面+目录+页码+引用 |

### 核心特性

- 🎯 **智能需求澄清** — 4 维度结构化访谈，预计 10~15 轮，前端有进度条提示
- 🔍 **STORM 多视角搜索** — 借鑑 Stanford 论文，自动发现 3-5 个研究视角
- 💬 **模拟专家对话** — 每个视角 3 轮追问：初始搜索 → 追問 → 深入追問
- ✅ **事实交叉验证** — AI 识别关键主张，至少 2 个独立来源确认
- 📊 **图表自动生成** — ECharts 数据图表 + Mermaid 流程图/时间线
- 📄 **学术级 PDF** — Typst 引擎，封面+目录+页码+引用+方法论+局限性声明
- 🔄 **动态补充 Loop** — 报告生成后贴入链接 → 自动抓取 → 整合进报告 → 重新生成
- 💾 **会话持久化** — 支持恢复、列表、删除，随时继续之前的研究

### 快速开始

**前置要求：** Node.js 16+, Python 3.8+, Typst v0.14+, DeepSeek API Key

```bash
git clone https://github.com/Rookage/deep-research-assistant.git
cd deep-research-assistant
npm install
pip install httpx lxml python-docx python-pptx

# 安装 Typst
choco install typst        # Windows
brew install typst          # macOS

cp .env.example .env        # 填入 DeepSeek API Key
npm start                   # http://localhost:3001
```

### 四阶段流水线

```
输入模糊需求 → 视角发现 → 多视角深度搜索 → 事实核查 → 学术级报告
                                                                  ↕
                                                           🔄 补充链接 Loop
```

### 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Node.js + Express |
| AI | DeepSeek API |
| 搜索 | 百度 + Bing |
| PDF | Typst v0.14.2 |
| 图表 | ECharts + Mermaid |
| 内容抓取 | httpx + lxml（Python） |
| 方法论 | Stanford STORM |

### 许可证

MIT

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/Rookage">Rookage</a></sub>
</p>
