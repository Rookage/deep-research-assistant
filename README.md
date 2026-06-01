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
<h3 align="center">模糊需求 → 多视角深度研究 → 学术级报告（PDF/DOCX/PPTX）</h3>

<p align="center">
  <b>不只是搜索，是真正的「研究」</b><br>
  借鑑 Stanford STORM 论文方法论 · 多视角分析 · 模拟专家对话 · 事实交叉验证
</p>

---

## 为什么你需要这个工具？

| 传统做法 | 本工具 |
|------|------|
| 手动 Google → 复制粘贴 → 自己写 | AI 自动追问澄清需求 → 多视角深度搜索 → 自动生成 |
| 只看一个角度的信息 | 🆕 **3-5 个视角**（政策/市场/技术/社会/国际） |
| 报告只有字，没有图 | 🆕 **ECharts 图表 + Mermaid 流程图** |
| 生成完就不能改了 | 🆕 **动态补充 Loop**：贴链接 → 整合 → 再生 |
| Word 排版惨不忍睹 | **Typst 学术级 PDF**：封面+目录+页码+引用 |

## ✨ 核心特性

- 🎯 **智能需求澄清** — 4 维度结构化访谈（目的/受众/边界/形式），AI 追问至信息充足。**预计 10~15 轮，前端有进度条提示**
- 🔍 **STORM 多视角搜索** — 借鑑 Stanford 论文，自动发现 3-5 个研究视角，每个视角深度挖掘
- 💬 **模拟专家对话** — 3 轮追问：初始搜索 → 追問 → 深入追問，不断挖掘
- ✅ **事实交叉验证** — AI 识别关键主张，至少 2 个独立来源确认，标注"已验证/单一来源/存在争议"
- 📊 **图表自动生成** — ECharts 数据图表 + Mermaid 流程图/时间线，让报告图文并茂
- 📄 **学术级 PDF** — Typst 引擎，封面+目录+页码+引用+方法论+局限性声明
- 🔄 **动态补充 Loop** — 报告生成后贴入链接 → 自动抓取 → 整合进报告 → 重新生成
- 💾 **会话持久化** — 支持恢复、列表、删除，随时继续之前的研究

## 🚀 快速开始

### 前置要求

- **Node.js** v16+
- **Python** 3.8+
- **Typst** v0.14+（PDF 报告）
- **DeepSeek API Key**（[免费注册](https://platform.deepseek.com)）

### 安装

```bash
git clone https://github.com/Rookage/deep-research-assistant.git
cd deep-research-assistant
npm install
pip install httpx lxml python-docx python-pptx

# 安装 Typst
choco install typst        # Windows
brew install typst          # macOS
snap install typst          # Linux
```

### 配置

```bash
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY
```

### 启动

```bash
npm start                   # http://localhost:3001
```

## 🏗️ 四阶段流水线

```
输入模糊需求
      │
      ▼
┌─────────────────────────────┐
│ 阶段 1：需求访谈 + 视角发现  │  ← DeepSeek + STORM
│ 4维度追问 → 纲要 → 3-5视角   │
└──────────┬──────────────────┘
           │ ✅ 用户确认
           ▼
┌─────────────────────────────┐
│ 阶段 2：多视角深度搜索        │  ← 百度 + Bing + httpx/lxml
│ 每视角3轮对话 → 去重 → 标注   │
└──────────┬──────────────────┘
           │ ✅ 用户确认
           ▼
┌─────────────────────────────┐
│ 阶段 3：事实核查              │
│ AI提取主张 → 交叉验证 → 标注  │
└──────────┬──────────────────┘
           │ ✅ 用户确认
           ▼
┌─────────────────────────────┐
│ 阶段 4：学术级报告生成        │  ← Typst PDF / DOCX / PPTX
│ 大纲→逐节+图表→打磨→下载      │
│ 🔄 可继续补充链接，Loop再生    │
└─────────────────────────────┘
```

## 📊 报告对比

| | 传统 DOCX | 本工具 PDF（Typst） |
|------|:--:|:--:|
| 封面 | ❌ | ✅ 学术级封面 |
| 目录 | 手动 | ✅ 自动生成 |
| 页码 | ❌ | ✅ 自动 |
| 引用标注 | 手动 | ✅ 超链接+编号 |
| 图表 | ❌ | ✅ ECharts + Mermaid |
| 方法论章节 | ❌ | ✅ |
| 局限性声明 | ❌ | ✅ |
| 多视角分析 | ❌ | ✅ |

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Node.js + Express |
| AI | DeepSeek API |
| 搜索 | Baidu + Bing |
| PDF | Typst v0.14.2 |
| Office | python-docx + python-pptx |
| 图表 | ECharts + Mermaid |
| 内容抓取 | httpx + lxml（Python） |
| 前端 | 原生 HTML/CSS/JS |
| 方法论 | Stanford STORM |

## 🤝 贡献

欢迎 Star ⭐、Issue、PR！

## 📝 许可证

MIT License

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/Rookage">Rookage</a></sub>
</p>
