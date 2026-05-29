<p align="center">
  <img src="https://img.shields.io/badge/version-0.4.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/platform-Node.js%2016%2B-brightgreen" alt="Node">
  <img src="https://img.shields.io/badge/AI-DeepSeek-blueviolet" alt="DeepSeek">
  <img src="https://img.shields.io/badge/PDF-Typst%20%E2%9C%A8-orange" alt="Typst">
</p>

<h1 align="center">🔬 AI 深度研究助手</h1>
<h3 align="center">输入模糊需求 → 输出专业研究报告</h3>

<p align="center">
  <b>四阶段流水线</b>：需求访谈 → 多源搜索 → 事实核查 → PDF/DOCX/PPTX 报告生成
</p>

---

## ✨ 核心特性

- 🎯 **智能需求澄清** — 4 维度结构化访谈（目的/受众/边界/形式），AI 自动追问直到信息充足
- 🔍 **多源并行搜索** — 自动拆解搜索策略，百度 + Bing 双引擎，时效性 + 信源质量双重标注
- ✅ **事实交叉验证** — AI 识别关键主张，多源交叉验证，标注"已验证/单一来源/存在争议"
- 📄 **专业报告生成** — **Typst 精美 PDF**（封面+目录+页码+引用） / DOCX / PPTX 三选一
- 💾 **会话持久化** — JSON 文件存储，支持恢复、列表、删除
- 🎨 **专业商务风 UI** — 原生 HTML/CSS/JS，零框架依赖

## 🚀 快速开始

### 前置要求

- **Node.js** v16+
- **Python** 3.8+（用于内容抓取和文档生成）
- **Typst** v0.14+（用于 PDF 报告）
- **DeepSeek API Key**

### 安装

```bash
# 克隆仓库
git clone https://github.com/t122743663-crypto/deep-research-assistant.git
cd deep-research-assistant

# 安装 Node.js 依赖
npm install

# 安装 Python 依赖
pip install httpx lxml python-docx python-pptx

# 安装 Typst（Windows）
choco install typst
# 或 macOS: brew install typst
# 或 Linux: snap install typst
```

### 配置

```bash
# 复制配置文件
cp .env.example .env
```

编辑 `.env`：

```env
DEEPSEEK_API_KEY=sk-your-key-here  # 必填
PORT=3001                            # 可选，默认 3001
SEARCH_PROVIDER=baidu                # baidu（免费）或 bing（需 API Key）
BING_API_KEY=                        # 仅 bing 模式需要
```

### 启动

```bash
npm start
```

打开 **http://localhost:3001** 即可使用。

## 🏗️ 架构

```
用户输入需求
      │
      ▼
┌─────────────────────────┐
│ 阶段 1：需求访谈        │  ← DeepSeek AI 对话引擎
│ 4 维度追问 → 研究纲要    │
└──────────┬──────────────┘
           │ ✅ 用户确认
           ▼
┌─────────────────────────┐
│ 阶段 2：多源搜索        │  ← Baidu + Bing + httpx/lxml
│ 搜索策略 → 素材采集标注  │
└──────────┬──────────────┘
           │ ✅ 用户确认
           ▼
┌─────────────────────────┐
│ 阶段 3：事实核查        │  ← AI 关键主张提取 + 交叉验证
│ 验证/单一来源/争议标注   │
└──────────┬──────────────┘
           │ ✅ 用户确认
           ▼
┌─────────────────────────┐
│ 阶段 4：报告生成        │  ← Typst PDF / DOCX / PPTX
│ 大纲 → 逐节撰写 → 导出   │
└─────────────────────────┘
```

## 📁 项目结构

```
deep-research-assistant/
├── server.js                  ← Express 主入口（v0.4.0）
├── services/
│   ├── interviewer.js         ← 阶段 1：对话引擎 + 纲要生成
│   ├── researcher.js          ← 阶段 2：搜索 + 采集 + 标注
│   ├── factChecker.js         ← 阶段 3：事实提取 + 交叉验证
│   ├── reportWriter.js        ← 阶段 4：大纲 + 文档生成
│   └── sessionStore.js        ← 会话持久化
├── python/
│   ├── gen_report_typst.py    ← Typst PDF 生成（✨ 推荐）
│   ├── gen_report_docx.py     ← DOCX 生成
│   ├── gen_report_pptx.py     ← PPTX 生成
│   ├── report_template.typ    ← Typst 模板
│   └── scrapling_fetch.py     ← 网页内容抓取（httpx+lxml）
├── public/                    ← 前端（原生 HTML/CSS/JS）
│   ├── index.html
│   ├── css/style.css
│   └── js/main.js
├── db/
│   └── schema.sql             ← 数据库结构
└── PLAN.md                    ← 详细架构规划
```

## 🎨 报告格式对比

| | DOCX | PPTX | PDF（Typst） |
|---|:--:|:--:|:--:|
| 排版品质 | 一般 | 尚可 | ✨ **专业精美** |
| 封面 | 简单 | 有 | ✅ 正式封面 |
| 目录 | 手动 | ❌ | ✅ 自动生成 |
| 页码 | ❌ | 手动 | ✅ 自动 |
| 引用标注 | 有 | 无 | ✅ 附超链接 |

## 📄 示例报告

运行后输入研究主题，按流程操作即可获得专业报告。示例输出：

> **《中国新能源汽车出口欧洲市场前景分析》**
> 封面 → 目录 → 6 章节 → 15 条参考文献，308KB PDF

## 📊 信源标注体系

| 时效标记 | 含义 | 信源等级 | 含义 |
|:--:|------|:--:|------|
| 🟢 | 有效 | A | 政府/官方/学术 |
| 🟡 | 偏旧 | B | 知名媒体/咨询公司 |
| 🔴 | 过时 | C | 个人博客/论坛 |

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Node.js + Express |
| AI | DeepSeek API（`deepseek-chat`） |
| 搜索 | Baidu HTML 解析 + Bing API |
| PDF | Typst v0.14.2 |
| Office | python-docx + python-pptx |
| 内容抓取 | httpx + lxml（Python） |
| 前端 | 原生 HTML/CSS/JS |
| 存储 | JSON 文件持久化 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

## 📝 许可证

MIT License — 详见 [LICENSE](LICENSE) 文件。

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/t122743663-crypto">t122743663-crypto</a></sub>
</p>
