---
title: AI / Agent 阅读清单
description: Anthropic 工程与研究文章的中文导读目录。每篇链接官方原文，站内不转载英文全文。
outline: [2, 2]
---

# AI / Agent 阅读清单

面向希望看懂 AI、也看懂 Agent 的软件开发者。材料来自 Anthropic 官网的 Engineering、Research、News，以及配套文档。

本站每篇是 **非官方译文**：有中文导读和按原文结构写成的译文，英文原文请走官方链接。这里不转载英文全文。

入口：[Engineering](https://www.anthropic.com/engineering) · [Research](https://www.anthropic.com/research) · [Docs](https://docs.anthropic.com)

::: info 关于原文
「原文」链到 Anthropic。本站页面是我们的中文导读、摘要或译文。
:::

## 推荐阅读节奏 {#pace}

1. **第 1 周**：核心必读 1–4（Agent 是什么、上下文、MCP、怎么写工具）
2. **第 2 周**：核心必读 5–8（用代码调工具、Skills、Agent SDK、Claude Code）
3. **第 3 周**：[拆解 AI Agent 评测](./demystifying-evals-for-ai-agents)、[上下文检索](./contextual-retrieval)、[宪法式 AI](./constitutional-ai)
4. **之后**：多 Agent、托管 Agent、经济指数，按兴趣补

时间若只够在核心必读之外再加 3 篇，就加第 3 周那三篇。

## 一、核心必读 {#core}

建议按顺序读。这 8 篇是后面专题的共同语言。

### 1. 构建高效的 AI Agent

- **本站**：[构建高效的 AI Agent](./building-effective-agents)（译文）
- **原文**：[Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents)（Anthropic · Engineering）
- **为什么读**：先分清 Workflow（工作流）和 Agent。很多任务把步骤写成固定工作流就够了，只有路径没法事先写死时，才值得让模型自己决定下一步。文里的设计原则是后面所有专题的共同语言。

### 2. AI Agent 的有效上下文工程

- **本站**：[AI Agent 的有效上下文工程](./effective-context-engineering-for-ai-agents)（译文）
- **原文**：[Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)（Anthropic · Engineering）
- **为什么读**：从 prompt engineering（提示词工程）走到 context engineering（上下文工程），关心的是整个上下文里放什么、何时放。文中会碰到 JIT（即时加载）、compaction（上下文压缩）和注意力预算。注意力有预算，把窗口塞满会冲掉真正要记住的内容。

### 3. Model Context Protocol 介绍

- **本站**：[Model Context Protocol 介绍](./model-context-protocol)（译文）
- **原文**：[Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)（Anthropic · News）
- **为什么读**：MCP（Model Context Protocol，模型上下文协议）想少做一件重复劳动：每个模型和每套工具都发明一套接口。先弄清它统一的是什么，再读后面的工具和代码执行。

### 4. 为 AI Agent 编写有效工具

- **本站**：[为 AI Agent 编写有效工具](./writing-tools-for-agents)（译文）
- **原文**：[Writing effective tools for AI agents](https://www.anthropic.com/engineering/writing-tools-for-agents)（Anthropic · Engineering）
- **为什么读**：工具是 Agent 真正动手的地方。命名空间、返回里留下高信号、描述怎么写，会决定模型选不选得到对的工具。

### 5. 用代码执行调用 MCP

- **本站**：[用代码执行调用 MCP](./code-execution-with-mcp)（译文）
- **原文**：[Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)（Anthropic · Engineering）
- **为什么读**：工具一多，光是工具定义就能撑满上下文。这篇讲用写代码去调 MCP，工具定义就可以留在代码侧，不必全部堆进提示。研究侧有一篇同源文章，时间紧可以两篇择一。

### 6. 用 Agent Skills 装备 Agent

- **本站**：[用 Agent Skills 装备 Agent](./agent-skills)（译文）
- **原文**：[Equipping agents with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)（Anthropic · Engineering）
- **为什么读**：Agent Skills 用 SKILL.md 做渐进披露：平时只露出目录，用到再展开。和 Cursor 等产品里的 skill 是同一类想法。

### 7. 用 Claude Agent SDK 构建 Agent

- **本站**：[用 Claude Agent SDK 构建 Agent](./claude-agent-sdk)（译文）
- **原文**：[Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)（Anthropic · Engineering）
- **为什么读**：Claude Agent SDK 把循环收成 gather、act、verify，并讨论子 Agent，以及用文件系统充当上下文。适合已经决定要写 Agent 程序的人。

### 8. Claude Code 最佳实践

- **本站**：[Claude Code 最佳实践](./claude-code-best-practices)（译文）
- **原文**：[Claude Code best practices](https://www.anthropic.com/engineering/claude-code-best-practices)（Anthropic · Engineering）
- **为什么读**：放到真实的编码代理里看：上下文会胀，验收信号得是能跑的。对日常的 vibe coding 很具体。


## 二、工具与协议进阶 {#tools}

读完核心里的 MCP 和「怎么写工具」再看。标了研究版的，多半与 Engineering 版同源，时间紧就择一。

### 进阶工具使用

- **本站**：[进阶工具使用](./advanced-tool-use)（译文）
- **原文**：[Advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use)（Anthropic · Engineering）
- **为什么读**：Tool Search、Programmatic Tool Calling 和 Tool Use Examples：工具从一次列全，变成按需找，并用代码编排。研究侧有对照篇。

### 进阶工具使用（研究版）

- **本站**：[进阶工具使用（研究版）](./advanced-tool-use-research)（译文）
- **原文**：[Advanced tool use](https://www.anthropic.com/research/advanced-tool-use)（Anthropic · Research）
- **为什么读**：与 Engineering 版同一主题的研究侧表述。两篇对照着读。

### 用代码执行调用 MCP（研究版）

- **本站**：[用代码执行调用 MCP（研究版）](./code-execution-with-mcp-research)（译文）
- **原文**：[Code execution with MCP](https://www.anthropic.com/research/code-execution-with-mcp)（Anthropic · Research）
- **为什么读**：与 Engineering 的「用代码执行调用 MCP」同源。时间紧，两边择一精读即可。


## 三、评测、Harness 与长期运行 {#evals}

关心两件事时再读：怎么知道 Agent 真的变好了，以及任务要跑很久时外壳怎么设计。

### 拆解 AI Agent 评测

- **本站**：[拆解 AI Agent 评测](./demystifying-evals-for-ai-agents)（译文）
- **原文**：[Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)（Anthropic · Engineering）
- **为什么读**：把评测拆开：task（任务）、trial（一次运行）、grader（评分器）、harness（任务脚手架）。先分清是在测能力，还是在做回归，再谈分数。

### 长时运行应用的 Harness 设计

- **本站**：[长时运行应用的 Harness 设计](./harness-design-long-running-apps)（译文）
- **原文**：[Harness design for long-running apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)（Anthropic · Engineering）
- **为什么读**：应用开发任务要跑很久时，harness（任务脚手架）怎么拆阶段，怎么把状态留在模型外面。

### 扩展托管 Agent

- **本站**：[扩展托管 Agent](./managed-agents)（译文）
- **原文**：[Scaling Managed Agents](https://www.anthropic.com/research/managed-agents)（Anthropic · Research）
- **为什么读**：把 session（会话）、harness（任务脚手架）、sandbox（沙箱）拆开，Agent 就可以跨过单次请求，被长期托管。

### 我们如何构建多 Agent 研究系统

- **本站**：[我们如何构建多 Agent 研究系统](./multi-agent-research-system)（译文）
- **原文**：[How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)（Anthropic · Engineering）
- **为什么读**：Orchestrator–worker（编排者–工作者）怎么分工，子 Agent 如何把信息压短再交回去，以及生产里实际踩过的坑。

### Claude 与 SWE-Bench

- **本站**：[Claude 与 SWE-Bench](./swe-bench-sonnet)（译文）
- **原文**：[Claude SWE-Bench](https://www.anthropic.com/engineering/swe-bench-sonnet)（Anthropic · Engineering）
- **为什么读**：在 SWE-Bench 这类软件工程评测上，脚手架宜薄，把控制权留给模型。

### Claude Code 质量复盘

- **本站**：[Claude Code 质量复盘](./claude-code-quality-postmortem)（译文）
- **原文**：[Claude Code quality postmortem](https://www.anthropic.com/engineering/april-23-postmortem)（Anthropic · Engineering）
- **为什么读**：系统提示里一行改动，就可能让模型看起来变笨。这篇复盘评测、定位和回滚是怎么做的。


## 四、检索、缓存与 Computer Use {#retrieval}

两篇彼此独立，可以单篇读。

### 上下文检索

- **本站**：[上下文检索](./contextual-retrieval)（译文）
- **原文**：[Contextual Retrieval](https://www.anthropic.com/research/contextual-retrieval)（Anthropic · Research）
- **为什么读**：嵌入之前先给 chunk 补上它自己的上下文，检索会稳很多；再配合 prompt caching（提示缓存）把成本拉下来。

### 开发 Computer Use 模型

- **本站**：[开发 Computer Use 模型](./developing-computer-use)（译文）
- **原文**：[Developing a computer use model](https://www.anthropic.com/research/developing-computer-use)（Anthropic · Research）
- **为什么读**：模型看屏幕、点鼠标时，能力边界在哪，prompt injection 又会从界面的哪一层进来。


## 五、对齐、价值观与安全思路 {#alignment}

想理解原则从哪来时再读，不阻塞前面的工程实践。

### 宪法式 AI

- **本站**：[宪法式 AI](./constitutional-ai)（译文）
- **原文**：[Constitutional AI](https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback)（Anthropic · Research）
- **为什么读**：用一套明文原则，加上 AI 反馈（RLAIF，用 AI 反馈做的强化学习），让模型参与自己的对齐。对齐讨论里的经典一篇。

### Claude 的宪法

- **本站**：[Claude 的宪法](./claudes-constitution)（译文）
- **原文**：[Claude's Constitution](https://www.anthropic.com/research/claudes-constitution)（Anthropic · Research）
- **为什么读**：宪法原则的可读版。用来看 Claude 的价值观具体写成了什么，而不只停在口号。


## 六、行业与用法洞察 {#industry}

从真实使用看 AI 落在什么工作上。和「怎么做 Agent」是两条线。

### Anthropic 经济指数介绍

- **本站**：[Anthropic 经济指数介绍](./anthropic-economic-index)（译文）
- **原文**：[Introducing the Anthropic Economic Index](https://www.anthropic.com/research/the-anthropic-economic-index)（Anthropic · Research）
- **为什么读**：从真实对话看 AI 落在哪些职业任务上，其中有多少是增强，有多少是自动化。

### 经济指数：经济原语

- **本站**：[经济指数：经济原语](./economic-index-primitives)（译文）
- **原文**：[Economic Index: Economic primitives](https://www.anthropic.com/research/anthropic-economic-index-january-2026-report)（Anthropic · Research）
- **为什么读**：用任务复杂度、自主度、成功率这些经济原语来描述用法。

### 经济指数：学习曲线

- **本站**：[经济指数：学习曲线](./economic-index-learning-curves)（译文）
- **原文**：[Economic Index: Learning curves](https://www.anthropic.com/research/economic-index-march-2026-report)（Anthropic · Research）
- **为什么读**：同一批人用得越久，成功率怎么变。适合和「模型变强了」分开看。

### Clio：隐私保护下的用法分析

- **本站**：[Clio：隐私保护下的用法分析](./clio)（译文）
- **原文**：[Clio](https://www.anthropic.com/research/clio)（Anthropic · Research）
- **为什么读**：既要分析真实用法，又不能翻看用户内容。Clio 讲的是隐私保护下的这套做法。


## 七、动手手册 {#docs}

官网文章讲为什么，文档讲怎么调。这些页面会改版，这里只链出，不单建译文页。

- [提示词工程](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- [工具使用](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview)
- [MCP](https://docs.anthropic.com/en/docs/agents-and-tools/mcp)
- [Agent Skills](https://docs.anthropic.com/en/docs/build-with-claude/skills-guide)
- [Claude Agent SDK / Agents](https://docs.anthropic.com)

具体路径以文档侧栏为准，版本会迭代。

## 纯链接清单 {#links}

方便复制。阅读请走上面的分栏，那里有导读。

```text
https://www.anthropic.com/engineering/building-effective-agents
https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
https://www.anthropic.com/news/model-context-protocol
https://www.anthropic.com/engineering/writing-tools-for-agents
https://www.anthropic.com/engineering/code-execution-with-mcp
https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk
https://www.anthropic.com/engineering/claude-code-best-practices
https://www.anthropic.com/engineering/advanced-tool-use
https://www.anthropic.com/research/advanced-tool-use
https://www.anthropic.com/research/code-execution-with-mcp
https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
https://www.anthropic.com/engineering/harness-design-long-running-apps
https://www.anthropic.com/research/managed-agents
https://www.anthropic.com/engineering/multi-agent-research-system
https://www.anthropic.com/engineering/swe-bench-sonnet
https://www.anthropic.com/engineering/april-23-postmortem
https://www.anthropic.com/research/contextual-retrieval
https://www.anthropic.com/research/developing-computer-use
https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback
https://www.anthropic.com/research/claudes-constitution
https://www.anthropic.com/research/the-anthropic-economic-index
https://www.anthropic.com/research/anthropic-economic-index-january-2026-report
https://www.anthropic.com/research/economic-index-march-2026-report
https://www.anthropic.com/research/clio
https://www.anthropic.com/engineering
https://www.anthropic.com/research
https://docs.anthropic.com
https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview
https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview
https://docs.anthropic.com/en/docs/agents-and-tools/mcp
https://docs.anthropic.com/en/docs/build-with-claude/skills-guide
```
