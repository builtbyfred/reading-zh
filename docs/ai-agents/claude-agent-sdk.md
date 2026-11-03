---
title: "用 Claude Agent SDK 构建 Agent"
title_en: "Building agents with the Claude Agent SDK"
description: "给 Claude 一台计算机：用收集上下文、采取行动、验证工作的循环，在 Claude Agent SDK 上做 Agent。"
source: "Anthropic"
source_url: "https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk"
status: "译文"
tags:
  - "SDK"
---

# 用 Claude Agent SDK 构建 Agent

**非官方译文。** 官方原文：[Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)（Anthropic · Engineering）。

## 导读

Claude Code 的那层 harness 被改名成 Claude Agent SDK，因为同一套循环不只用来写代码。这篇用一个邮件 Agent 把循环拆成三拍：收集上下文、采取行动、验证工作。适合已经决定要写 Agent 程序、想知道文件系统、子 Agent、compaction 和 MCP 各放在哪一拍的人。

抓取原文时，页面未给出单独的发表日期，因此 frontmatter 不填 `date`。

## 译文

Claude Agent SDK 是一组工具，帮助开发者在 Claude Code 之上构建强大的 Agent。这篇文章讲如何开始，并分享他们的做法。

去年，他们和客户一起分享了构建有效 Agent 的经验。此后发布了 Claude Code，这是他们最初为支持 Anthropic 内部开发者生产力而做的智能体式编程方案。

过去几个月，Claude Code 远不止一个编码工具。在 Anthropic，他们用它做深度研究、视频创作和记笔记，以及无数其他非编码应用。事实上，它已经开始驱动几乎所有主要的 Agent 循环。

换句话说，驱动 Claude Code 的 Agent harness（任务脚手架，即当时的 Claude Code SDK）也能驱动许多其他类型的 Agent。为反映这个更宽的愿景，他们把 Claude Code SDK 改名为 Claude Agent SDK。

这篇说明为什么做 Claude Agent SDK、如何用它做自己的 Agent，以及团队自己部署中浮现的做法。

### 给 Claude 一台计算机

Claude Code 背后的关键设计原则是：Claude 需要程序员每天用的同一套工具。它要能在代码库里找到合适的文件、写和改文件、做 lint、运行、调试、再改，有时迭代这些动作直到代码成功。

他们发现，通过终端把用户的计算机交给 Claude，它就有了像程序员那样写代码所需的东西。

这也让 Claude Code 里的 Claude 在非编码任务上有效。给它运行 bash、编辑文件、创建文件和搜索文件的工具，Claude 就能读 CSV、搜网页、做可视化、解释指标，以及做各种其他数字工作——简言之，用一台计算机做出通用 Agent。Claude Agent SDK 背后的关键设计原则，是给你的 Agent 一台计算机，让它们像人那样工作。

### 创造新类型的 Agent

他们认为，给 Claude 一台计算机，解锁了做出比以前更有效的 Agent 的能力。例如，用这个 SDK，开发者可以做：

- 金融 Agent：理解你的组合和目标，并通过访问外部 API、存储数据、运行代码做计算，帮助评估投资。
- 个人助理 Agent：帮忙订旅行、管理日历、安排约会、整理简报等，方法是连接内部数据源，并跨应用跟踪上下文。
- 客户支持 Agent：处理高歧义的用户请求，例如客服工单：收集并审阅用户数据、连接外部 API、回复用户，并在需要时升级给人。
- 深度研究 Agent：在大型文档集合上做全面研究：搜索文件系统、从多个来源分析和综合信息、跨文件交叉核对数据，并生成详细报告。

还有更多。核心上，SDK 给你构建原语，用来为你想自动化的任何工作流做 Agent。

### 构建你的 Agent 循环

在 Claude Code 里，Claude 常常在一个特定的反馈循环里运行：收集上下文 → 采取行动 → 验证工作 → 重复。

图：Agent 常常在这个反馈循环里运行：收集上下文、采取行动、验证工作，然后重复。图见[原文](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)。

这提供了一种思考其他 Agent、以及应给它们什么能力的有用方式。为说明这一点，他们走一遍如何在 Claude Agent SDK 里做一个邮件 Agent。

### 收集上下文

开发 Agent 时，你想给它的不只是一条提示：它要能获取并更新自己的上下文。SDK 里的功能可以这样帮忙。

#### 智能体式搜索与文件系统

文件系统代表可以拉进模型上下文的信息。

图：文件系统代表可以拉进模型上下文的信息。图见[原文](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)。

Claude 遇到大文件，如日志或用户上传的文件时，会用 `grep`、`tail` 这类 bash 脚本来决定如何把它们载入上下文。本质上，Agent 的文件夹和文件结构成为一种上下文工程。

邮件 Agent 可以把先前的对话存在一个叫 Conversations 的文件夹里。被问到这些对话时，它就可以在里面搜索以取得上下文。

#### 语义搜索

语义搜索通常比智能体式搜索快，但没那么准、更难维护、也更不透明。它把相关上下文切成块（chunk），把这些块嵌成向量，再通过查询这些向量来搜概念。鉴于这些限制，建议从智能体式搜索开始，只有在需要更快的结果或更多变体时才加语义搜索。

#### 子 Agent

Claude Agent SDK 默认支持子 Agent。子 Agent 主要有两个用处。第一，并行：可以拉起多个子 Agent 同时做不同任务。第二，管理上下文：子 Agent 用自己隔离的上下文窗口，只把相关信息送回编排者，而不是整个上下文。这使它们适合需要筛大量信息、而其中大部分没用的任务。

设计邮件 Agent 时，可以给它「搜索子 Agent」的能力。邮件 Agent 然后可以并行拉起多个搜索子 Agent——每个对邮件历史跑不同查询——并让它们只返回相关摘录，而不是完整邮件线程。

#### Compaction

Agent 跑很长时间时，上下文维护变得关键。Claude Agent SDK 的 compact 功能在接近上下文上限时自动总结先前的消息，这样 Agent 不会把上下文用完。它建在 Claude Code 的 compact 斜杠命令之上。

### 采取行动

收集好上下文之后，要给 Agent 灵活的行动方式。

#### 工具

工具是 Agent 执行的主要构件。工具在 Claude 的上下文窗口里很显眼，因此是 Claude 决定如何完成任务时会优先考虑的行动。这意味着你应当有意识地设计工具，以最大化上下文效率。更多做法见他们的博文《Writing effective tools for agents – with agents》。

因此，工具应当是你希望 Agent 采取的主要行动。如何在 Claude Agent SDK 里做自定义工具，见相应文档。

对邮件 Agent，可以把 `fetchInbox` 或 `searchEmails` 定义成 Agent 最主要、最频繁的行动。

#### Bash 与脚本

Bash 是一种通用工具，让 Agent 用计算机做灵活的工作。

在邮件 Agent 里，用户可能把重要信息存在附件中。Claude 可以写代码下载 PDF、转成文本，并在其中搜索有用信息。原文配有示意图，见[原文](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)。

#### 代码生成

Claude Agent SDK 擅长代码生成，而且有道理。代码精确、可组合、可无限复用，对需要可靠执行复杂操作的 Agent 来说，是理想的输出。

做 Agent 时要想：哪些任务若表达成代码会受益？答案常常能解锁显著能力。

例如，他们当时在 Claude.AI 推出的文件创建，完全依赖代码生成。Claude 写 Python 脚本来创建 Excel 表格、PowerPoint 演示和 Word 文档，从而保证一致的格式和用其他方式很难达到的复杂功能。

在邮件 Agent 里，可能想允许用户为入站邮件创建规则。为此可以写在该事件上运行的代码。原文配有示意图，见[原文](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)。

#### MCP

MCP（Model Context Protocol，模型上下文协议）提供到外部服务的标准化集成，自动处理认证和 API 调用。这意味着可以把 Agent 连到 Slack、GitHub、Google Drive 或 Asana 这类工具，而不必自己写定制集成代码或管理 OAuth 流程。

对邮件 Agent，可能想搜索 Slack 消息以理解团队上下文，或查看 Asana 任务，看是否已有人被指派处理某客户请求。有了 MCP 服务器，这些集成开箱即用：Agent 可以直接调用 `search_slack_messages` 或 `get_asana_tasks` 这类工具，其余由 MCP 处理。

不断增长的 MCP 生态意味着，随着预构建集成可用，你可以很快给 Agent 加新能力，把注意力放在 Agent 行为上。

### 验证你的工作

Claude Code SDK 通过评估自己的工作来结束智能体循环。能检查并改进自己输出的 Agent 从根本上更可靠：它们在错误复合之前抓住错误，漂移时自我纠正，并随迭代变好。

关键是给 Claude 具体的方式来评估工作。他们发现三种做法有效：

#### 定义规则

最好的反馈形式，是为输出提供清楚定义的规则，然后说明哪些规则失败了、为什么。

代码 lint 是出色的基于规则的反馈。反馈越深入越好。例如，生成 TypeScript 再 lint，通常好过生成纯 JavaScript，因为它多给你几层反馈。

生成邮件时，可能希望 Claude 检查邮箱地址是否有效（否则抛错），以及用户是否以前给对方发过邮件（如果是，抛出警告）。

#### 视觉反馈

用 Agent 完成视觉任务，如 UI 生成或测试时，视觉反馈（截图或渲染）会有帮助。例如发送带 HTML 格式的邮件时，可以截下生成的邮件，交回模型做视觉核验和迭代打磨。模型然后检查视觉输出是否与所要求的一致。

例如：

- 布局：元素位置是否正确？间距是否合适？
- 样式：颜色、字体和格式是否如预期？
- 内容层级：信息是否按正确顺序呈现，强调是否恰当？
- 响应式：看起来是否破损或拥挤？（不过单张截图的视口信息有限）

用 Playwright 这类 MCP 服务器，可以把这个视觉反馈循环自动化：截下渲染后的 HTML、捕捉不同视口尺寸，甚至测试交互元素——都在 Agent 的工作流里。

图：来自大语言模型的视觉反馈可以为 Agent 提供有用指引。图见[原文](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)。

#### 用 LLM 当评判

也可以让另一个语言模型按模糊规则「评判」Agent 的输出。这通常不是很稳健的方法，也可能有很重的延迟代价，但对「任何性能提升都值得这份成本」的应用，它会有帮助。

邮件 Agent 可以有一个单独的子 Agent 评判草稿的语气，看是否与用户先前的消息相配。

### 测试并改进你的 Agent

把 Agent 循环走几遍之后，建议测试 Agent，确保它为任务装备妥当。改进 Agent 的最好办法，是仔细看它的输出，尤其是失败的情况，并站在它的位置：它有没有完成工作所需的工具？

评估 Agent 是否装备妥当，还可以问：

- 如果 Agent 误解了任务，它可能缺关键信息。你能否改变搜索 API 的结构，让它更容易找到需要知道的东西？
- 如果 Agent 反复在某任务上失败，能否在工具调用里加一条正式规则来识别并修复失败？
- 如果 Agent 修不了自己的错误，能否给它更有用或更有创造性的工具，换一种方式处理问题？
- 如果 Agent 的表现随你加功能而波动，根据客户用法建一套有代表性的测试集，做程序化评估（evals）。

### 开始使用

Claude Agent SDK 让构建自主 Agent 更容易：给 Claude 一台计算机，它可以在上面写文件、跑命令，并迭代自己的工作。

心里有这条 Agent 循环（收集上下文、采取行动、验证工作），就可以做出可靠、易于部署和迭代的 Agent。

今天就可以开始用 Claude Agent SDK。已经在 SDK 上构建的开发者，建议按指南迁移到最新版本。

## 致谢

作者为 Thariq Shihipar。笔记和编辑来自 Molly Vorwerck、Suzanne Wang、Alex Isken、Cat Wu、Keir Bradwell、Alexander Bricken 和 Ashwin Bhat。

## 笔记

- 改名的理由值得记住：同一套 harness 先服务编码，再被拿去研究、做视频、记笔记。SDK 卖的是「一台计算机」，不是「一个编码专用循环」。
- 语义搜索被明确放在智能体式搜索之后。先用文件系统和 grep，只有要更快或要更多变体时再加向量。
- 验证一节把规则（能报错的检查）放在 LLM 评判之前。邮件地址校验是规则，语气评判才是 LLM。

返回 [AI / Agent 阅读清单](./)。
