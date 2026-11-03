---
layout: home
title: 阅读译库
titleTemplate: false

hero:
  name: 阅读译库
  text: 中文阅读、译文与笔记
  tagline: 精选文章的非官方中文导读。链接官方原文，不转载英文全文。
  actions:
    - theme: brand
      text: 从 AI / Agent 书单开始
      link: /ai-agents/
    - theme: alt
      text: 自身成长
      link: /growth/

features:
  - title: 译文在这里，原文在源头
    details: 每篇标注非官方译文，并链到官方 URL。不镜像第三方英文全文。
  - title: 主题不限于 AI
    details: 现在先放 AI / Agent、自身成长和短笔记。别的来源按同一格式往里加。
  - title: 按周往下读
    details: 先读出共同语言，再补评测、检索与对齐。时间紧就只加三篇。
---

## 这个仓库是什么

`reading-zh` 是一个用 Markdown 维护的中文阅读库，站点由 VitePress 生成。

适合放三类东西：

- 技术文章的中文译文或结构化摘要，例如 Anthropic、OpenAI 的工程博客，或 X 上的长文
- 读完之后的短笔记、术语对照
- 个人成长、写作、决策等和 AI 无关的阅读

界面和正文使用简体中文。

我们不镜像、也不粘贴第三方英文原文。文章页会链接官方地址，并标明 **非官方译文**。原文版权仍归原权利人，见仓库根目录的 `LICENSE`。

## 现在有哪些栏目

- [AI / Agent](/ai-agents/)：已放入一份 Anthropic 阅读清单，25 篇都是译文。另有两篇 Pi coding agent 的译文，以及第九节社区与产业精选（摘要）。
- [自身成长](/growth/)：栏目已留好，等第一篇真正要译的文章。
- [短摘录 / 笔记](/notes/)：给更短的卡片，不要求整篇译文。

## 怎么参与

1. 克隆仓库，按根目录 `README.md` 在本地执行 `npm install` 和 `npm run dev`。
2. 读 `CONTRIBUTING.md`：文件放哪、frontmatter 怎么写、Agent / harness / compaction 这些词怎么统一。
3. 补一篇摘要或译文，或新增一篇书目，然后提交 Pull Request。只有导读、状态仍是「待译」，也比空链接有用。

## 阅读节奏

从 AI / Agent 读起的话，一次推进一周的篇目：

1. **第 1 周**：核心必读 1–4。Agent 是什么、上下文、MCP、怎么写工具。
2. **第 2 周**：核心必读 5–8。用代码调工具、Skills、Agent SDK、Claude Code。
3. **第 3 周**：[拆解 AI Agent 评测](/ai-agents/demystifying-evals-for-ai-agents)、[上下文检索](/ai-agents/contextual-retrieval)、[宪法式 AI](/ai-agents/constitutional-ai)。
4. **之后**：多 Agent、托管 Agent、经济指数，按兴趣补。

时间若只够在八篇核心之外再加三篇，就加第 3 周这三篇。分栏目录在 [AI / Agent 阅读清单](/ai-agents/)。
