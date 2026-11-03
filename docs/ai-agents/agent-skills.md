---
title: "用 Agent Skills 装备 Agent"
title_en: "Equipping agents with Agent Skills"
description: "Skill 是带 SKILL.md 的目录：启动时只载入名称和描述，用到再逐层展开指令、文件和代码。"
source: "Anthropic"
source_url: "https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills"
date: 2025-10-16
status: "译文"
tags:
  - "Skills"
---

# 用 Agent Skills 装备 Agent

**非官方译文。** 官方原文：[Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)（Anthropic · Engineering）。

## 导读

通用 Agent 有了计算机之后，缺的是可组合、可携带的领域专长。Skill 把这份专长收成一个目录：平时只露出名称和描述，任务相关时再读正文、附属文件和脚本。适合已经在用 Claude Code 或 Agent SDK、又不想把所有流程写进系统提示的人。

原文发表于 2025 年 10 月 16 日。页上另有 2025 年 12 月 18 日的更新：Agent Skills 已作为跨平台可移植的开放标准发布。

## 译文

模型能力提高之后，现在可以做与完整计算环境交互的通用 Agent。例如 Claude Code 可以用本地代码执行和文件系统，跨领域完成复杂任务。但这些 Agent 更强之后，我们需要更可组合、可扩展、可携带的方式，给它们装备领域专长。

这促使他们做出 Agent Skills：有组织的指令、脚本和资源文件夹，Agent 可以动态发现并加载，从而在特定任务上做得更好。Skill 把你的专长打包成 Claude 可组合的资源，扩展 Claude 的能力，把通用 Agent 变成适合你需要的专门 Agent。

为 Agent 做一个 Skill，就像给新员工整理一份入职指南。不必为每个用例做碎片化、定制设计的 Agent，任何人现在都可以通过捕捉和分享过程性知识，用可组合的能力让自己的 Agent 专门化。这篇文章解释 Skill 是什么、如何工作，并分享构建自己的 Skill 的做法。

图：一个 Skill 是包含 `SKILL.md` 的目录，里面是有组织的指令、脚本和资源，给 Agent 额外能力。图见[原文](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)。

### Skill 的解剖

看一个真实例子：驱动 Claude 当时新推出的文档编辑能力的 Skill 之一。Claude 已经很懂如何理解 PDF，但直接操作它们的能力有限（例如填写表单）。这个 PDF Skill 把这些新能力交给 Claude。

最简单时，Skill 是一个包含 `SKILL.md` 的目录。这个文件必须以 YAML frontmatter 开头，包含一些必需元数据：`name` 和 `description`。启动时，Agent 把每个已安装 Skill 的 `name` 和 `description` 预载入系统提示。

这份元数据是渐进披露的第一层：信息刚好够 Claude 知道何时该用每个 Skill，而不把全部内容载入上下文。文件正文是第二层细节。如果 Claude 认为这个 Skill 与当前任务相关，它会读取完整的 `SKILL.md` 来加载该 Skill。

图：`SKILL.md` 必须以包含名称和描述的 YAML frontmatter 开头，启动时载入系统提示。图见[原文](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)。

Skill 变复杂后，可能有太多上下文，放不进单个 `SKILL.md`，或者有些上下文只在特定场景相关。这时 Skill 可以在目录里捆绑额外文件，并在 `SKILL.md` 里按名字引用。这些额外链接文件是第三层（以及更深层）细节，Claude 只在需要时才选择去导航和发现。

在下面展示的 PDF Skill 里，`SKILL.md` 指向两个额外文件（`reference.md` 和 `forms.md`），由 Skill 作者选择与核心 `SKILL.md` 放在一起。把填表说明移到单独文件 `forms.md`，作者就能让 Skill 的核心保持精简，信任 Claude 只在填表时才读 `forms.md`。

图：可以通过额外文件把更多上下文放进 Skill，再由 Claude 根据系统提示触发。图见[原文](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)。

渐进披露是让 Agent Skills 灵活、可扩展的核心设计原则。像一本组织良好的手册：先是目录，然后是具体章节，最后是详细附录。Skill 让 Claude 只在需要时加载信息。

拥有文件系统和代码执行工具的 Agent，做某项任务时不必把整个 Skill 读进上下文窗口。这意味着可以捆进一个 Skill 的上下文量，实际上是无界的。

### Skill 与上下文窗口

下面的图显示：用户消息触发一个 Skill 时，上下文窗口如何变化。

图：Skill 经由系统提示在上下文窗口里被触发。图见[原文](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)。

图中的操作顺序：

1. 一开始，上下文窗口里有核心系统提示、每个已安装 Skill 的元数据，以及用户的初始消息；
2. Claude 通过调用 Bash 工具读取 `pdf/SKILL.md` 来触发 PDF Skill；
3. Claude 选择读取与该 Skill 捆绑的 `forms.md`；
4. 最后，Claude 已经从 PDF Skill 加载了相关指令，继续做用户的任务。

### Skill 与代码执行

Skill 也可以包含代码，供 Claude 按任务性质自行决定当作工具来执行。

大语言模型在许多任务上出色，但某些操作更适合传统代码执行。例如，用生成 token 的方式给列表排序，远比直接跑排序算法贵。除了效率，许多应用需要只有代码能提供的确定可靠性。

在他们的例子里，PDF Skill 包含一段预先写好的 Python 脚本，读取 PDF 并抽出所有表单字段。Claude 可以运行这段脚本，而不必把脚本或 PDF 载入上下文。因为代码是确定的，这个工作流一致、可重复。

图：Skill 也可以包含代码，供 Claude 按任务性质自行决定执行。图见[原文](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)。

### 开发与评估 Skill

开始编写和测试 Skill 的一些指引：

- 从评估开始：在有代表性的任务上跑 Agent，观察它们在哪里吃力或需要额外上下文，从而找出能力上的具体缺口。然后增量地做 Skill 来补这些短板。
- 为规模而组织：当 `SKILL.md` 变得难用，把内容拆到单独文件并引用它们。如果某些上下文互斥或很少一起用，把路径分开会减少 token 用量。最后，代码既可以是可执行工具，也可以是文档。应当清楚 Claude 是应该直接跑脚本，还是把它们读进上下文当参考。
- 从 Claude 的视角想：在真实场景里观察 Claude 如何使用你的 Skill，并据此迭代。留意意外的轨迹，或对某些上下文的过度依赖。特别注意 Skill 的 `name` 和 `description`。Claude 会用它们决定是否针对当前任务触发该 Skill。
- 和 Claude 一起迭代：和 Claude 做任务时，让它把成功做法和常见错误捕捉成 Skill 里可复用的上下文和代码。如果它用 Skill 完成任务时走偏，让它反省哪里错了。这个过程帮助你发现 Claude 实际上需要什么上下文，而不是事先去猜。

### 使用 Skill 时的安全考量

Skill 通过指令和代码给 Claude 新能力。这使它们强大，也意味着恶意 Skill 可能在使用它们的环境里引入漏洞，或指示 Claude 外泄数据、采取非预期行动。

建议只从受信任的来源安装 Skill。从不太受信任的来源安装时，使用前要彻底审计。先读 Skill 里捆绑的文件内容，理解它做什么，特别注意代码依赖以及捆绑的资源，如图像或脚本。同样，注意 Skill 里指示 Claude 连接潜在不受信任的外部网络来源的指令或代码。

### Skill 的未来

Agent Skills 今天已在 Claude.ai、Claude Code、Claude Agent SDK 和 Claude Developer Platform 上得到支持。

接下来几周，他们会继续增加支持 Skill 完整生命周期的功能：创建、编辑、发现、分享和使用。他们尤其期待 Skill 帮助组织和个人与 Claude 分享自己的上下文和工作流。他们也会探索 Skill 如何补充 MCP 服务器：教 Agent 涉及外部工具和软件的更复杂工作流。

再往前看，他们希望让 Agent 能自己创建、编辑和评估 Skill，把自己的行为模式编成可复用的能力。

Skill 是一个简单概念，格式也相应简单。这种简单让组织、开发者和终端用户更容易构建定制 Agent，并给它们新能力。

## 笔记

- 三层披露（元数据、`SKILL.md` 正文、按需文件）是这篇的结构，不是「把说明书一次性塞进系统提示」。
- 脚本留在 Skill 里执行、不进上下文，和[用代码执行调用 MCP](./code-execution-with-mcp)把中间数据留在执行环境是同一类省 token 的办法。
- `name` 和 `description` 决定会不会被触发。写得含糊，后面的文件再完整也不会被读到。

返回 [AI / Agent 阅读清单](./)。
