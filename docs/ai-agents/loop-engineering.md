---
title: "循环工程：让系统去提示 Agent"
title_en: "Loop Engineering"
description: "Addy Osmani 把 loop engineering 放在 harness 上一层：五件套、磁盘上的状态，以及验证和理解债。"
source: "Addy Osmani"
source_url: "https://addyosmani.com/blog/loop-engineering/"
date: 2026-06-07
status: "摘要"
tags:
  - "Agent"
  - "harness"
  - "loop engineering"
---

# 循环工程：让系统去提示 Agent

**非官方译文。** 原文：[Loop Engineering](https://addyosmani.com/blog/loop-engineering/)（Addy Osmani · 2026-06-07）。

## 导读

这篇给已经会「写一句提示、读一段回复、再写下一句」的人换一个工作层。Osmani 把 loop engineering（循环工程）放在单次 Agent 的 harness（任务脚手架）上面：人设计一个会自己发现工作、派 Agent、检查结果、把进度写到对话外面的系统。

适合已经在用 Codex 或 Claude Code、开始把重复活交给定时任务的人。文中的警告同样具体：循环跑得越顺，验证、理解债和认知投降越要由人守住。

## 摘要

### 循环在脚手架上面一层

过去大约两年，编码 Agent 的用法是人拿着工具：写提示、补上下文、一轮一轮接着聊。Osmani 认为这一段正在过去。现在要建的是一个小系统：找出待做的事，分发出去，检查，写下完成了什么，再决定下一步。去戳 Agent 的是这个系统，人不再逐轮手打。

他引用 Peter Steinberger 的说法，大意是不该再亲自提示编码 Agent，而该设计会去提示它们的循环；也引用 Claude Code 负责人 Boris Cherny：自己的工作是写循环，循环再去提示 Claude。Osmani 同时说这还早，他持保留态度，并且 token 成本会因为用法差很多而剧烈波动。

他自己写过的近亲是 agent harness engineering：给单个 Agent 准备它运行的环境，以及那套「造软件的工厂」。循环工程在 harness 楼上。harness 负责一次运行；循环加上定时、派生小助手，并且自己喂自己。

他强调形状已经不绑在某一个产品上。一年前想要循环，得自己维护一堆 bash。现在这些零件随产品发货。Steinberger 列的东西几乎能对上 Codex，也几乎能对上 Claude Code。看清形状之后，争论用哪一个工具就让位给：设计一个换到另一个产品里仍然成立的循环。

### 五件套，外加一处记忆

一个循环要五样东西，再加一个记住进度的地方。

1. **Automations（定时自动化）**：按日程自己做发现和分诊。
2. **Worktree（隔离工作区）**：两个 Agent 并行时不踩同一份文件。
3. **Skill**：把项目知识写下来，免得 Agent 每次靠猜。
4. **插件与连接器**：接到已经在用的工具。连接器建立在 MCP（Model Context Protocol，模型上下文协议）上。
5. **子 Agent**：一个负责想和做，另一个负责检查。

第六样是记忆。一份 Markdown，或一块 Linear 看板，任何活在单次对话之外、记下「做完了什么、下一步是什么」的东西。模型和[长时运行](./harness-design-long-running-apps)里的结论一样：两次运行之间模型会忘掉上下文里的内容，所以记忆必须在磁盘上。Agent 会忘，仓库不会。

两边产品现在都有这五样。名字不完全一样，能力是同一组。下面按 Osmani 的对照压缩。细节以原文表格为准。

| 零件 | 在循环里干什么 | Codex | Claude Code |
| --- | --- | --- | --- |
| 定时自动化 | 按日程发现和分诊 | Automations：选项目、提示、节奏、环境；有发现的进 Triage；也有 `/goal` | 定时任务、cron、`/loop`、`/goal`、hooks、GitHub Actions |
| Worktree | 隔离并行改动 | 每个线程自带 worktree | `git worktree`、`--worktree`，子 Agent 可设 `isolation: worktree` |
| Skill | 写下项目知识 | `SKILL.md`，用 `$name` 或按描述隐式调用 | 同样是 `SKILL.md` |
| 插件 / 连接器 | 接上现有工具 | Connectors（MCP）加用于分发的插件 | MCP 服务器加插件 |
| 子 Agent | 构思和核验 | `.codex/agents/` 里的 TOML | `.claude/agents/` 里的 Task 子 Agent，以及 agent teams |
| 状态 | 记下做到哪 | Markdown，或经连接器写到 Linear | Markdown（`AGENTS.md`、进度文件），或经 MCP 写到 Linear |

### 定时自动化是心跳

没有日程，就只是你亲手跑过一次，还不是循环。Codex 在 Automations 里选项目、要跑的提示、频率，以及跑在本地检出还是后台 worktree。有发现的结果进 Triage 收件箱，没有发现的自己归档。文中说 OpenAI 内部用它做日常问题分诊、CI 失败摘要、提交简报、寻找上周新引入的缺陷。自动化可以调用 Skill，于是重复任务维持在 `$skill-name`，而不是把一大段说明粘进一个再也没人更新的日程。

Claude Code 用调度和 hooks 走到同一处：`/loop` 按间隔重跑提示或命令，也可以 cron，在 Agent 生命周期的某些点跑 shell，或把整件事放到 GitHub Actions，合上笔记本也继续。

会话内还有一层更接近这篇题目的原语。`/loop` 按节奏重跑。`/goal` 一直做到你写下的条件为真；每一轮之后由另一个小模型判断是否完成，写代码的那个不给自己打分。条件可以写成「`test/auth` 里的测试都过、lint 干净」。Codex 也有同名的 `/goal`，可暂停、继续、清除。Osmani 说这是全文的模式：同一原语，两套工具。

定时自动化负责把工作浮上来。循环的其余部分负责动手。

### Worktree：并行不要变成互踩

第二个 Agent 一跑起来，文件冲突就是失败模式，和两个工程师改同一行却没先说话一样。Git worktree 是共享同一仓库历史的另一份工作目录、另一条分支，一边的编辑碰不到另一边的检出。

Codex 把 worktree 做进产品，多条线程打同一个仓库。Claude Code 用 `git worktree`、`--worktree`，以及子 Agent 上的 `isolation: worktree`，做完可以清掉。Osmani 另文谈过编排税：worktree 拿掉机械冲突，人的审查带宽仍是天花板。能开多少路，由你看得过来多少决定。

### Skill：停止每轮重新解释项目

Skill 用来结束「每开一个会话都像金鱼一样把项目再说一遍」。两边都是一个带 `SKILL.md` 的目录，里面是说明和元数据，还可以有脚本、参考和素材。Codex 在你用 `$` 或 `/skills` 调用时运行，任务匹配描述时也会自己跑，所以描述宜紧、宜无聊。Claude Code 同样。和本站[用 Agent Skills 装备 Agent](./agent-skills)是同一类渐进披露。

Osmani 把 Skill 说成写在外面的意图：惯例、构建步骤、「因为那次事故我们不这么做」。Agent 每轮从冷启动开始，意图上的洞会被它自信地猜满。没有 Skill，循环每一圈都从零重新推导项目；有了 Skill，知识才会累积。

Skill 是编写格式，插件是分发方式。要跨仓库分享或打成一包，就包成插件。Codex 和 Claude Code 都如此。

### 插件和连接器：循环要碰到真工具

只能看见文件系统的循环很小。基于 MCP 的连接器让 Agent 读问题跟踪、查数据库、打预发 API、在 Slack 丢一条消息。两边都说 MCP，为一边写的连接器通常能在另一边用。插件把连接器和 Skill 捆在一起，队友一次装上，不必靠记忆重搭。

差别在于：Agent 说「修复在这里」，循环则可以自己开 PR、链上 Linear 工单，并在 CI 变绿后通知频道。连接器让循环在真实环境里行动，而不是只告诉你它本来可以做什么。

### 子 Agent：做的人和查的人分开

循环里最有用的结构，是把写的人和查的人拆开。写下代码的模型给自己的作业打分时太客气。第二个 Agent 用不同说明、有时用不同模型，能抓住第一个把自己说服的地方。

Codex 只在你要求时派子 Agent，同时跑，再折回一个答案。自定义 Agent 是 `.codex/agents/` 里的 TOML：名字、描述、说明，以及可选的模型和推理力度。安全审查可以是高力度的强模型，探索可以是只读的快模型。Claude Code 用 `.claude/agents/` 和在它们之间传工作的 agent teams。常见分法是一个探索、一个实现、一个按规格核验。

这在循环里特别要紧，因为循环在你没看着的时候跑。你信得过的核验者，是你能走开的理由。子 Agent 更费 token，每一路都有自己的模型和工具调用，所以只花在「第二意见值得付钱」的地方。`/goal` 底下也是这个分裂：另一个模型决定循环是否结束。

### 一条循环长什么样

Osmani 常用的形状是：

每天早上自动化跑在仓库上。提示调用一个分诊 Skill，读昨天的 CI 失败、未关闭的问题和新提交，把发现写进 Markdown 或 Linear。值得做的每一条，打开隔离 worktree，派一个子 Agent 起草修复，第二个子 Agent 按项目 Skill 和现有测试审查草稿。连接器负责开 PR、更新工单。循环处理不了的进 Triage，留给人。状态文件是脊梁：试过什么、过了什么、还开着什么。明天早上从今天停下的地方接着跑。

你做的是把这套设计一次。那些步骤不是你逐条提示的。Codex 和 Claude Code 能跑同一条循环，因为零件是同一组零件。

### 循环仍然不替你做的三件事

循环改变工作，人不从工作里消失。循环变好时，有三件事会更尖锐。

**验证仍在你身上。** 无人值守的循环也会无人值守地犯错。把核验子 Agent 和制作者拆开，是为了让「做完了」有意义；即便如此，「做完」是一项主张，不是证明。Osmani 重复他在 AI 时代代码审查里的那句：你的工作是交付你确认能跑的代码。

**理解会腐烂。** 循环越快交出不是你写的代码，存在的东西和你真正懂的东西之间的缝越大。这就是 comprehension debt（理解债）。顺滑的循环会让它长得更快，除非你去读循环做出来的东西。

**舒服的姿势是危险的。** 循环自己跑的时候，很容易不再有判断，只收下它给的结果。他把这叫做 cognitive surrender（认知投降）。带着判断去设计循环，是解药；为了免得思考去设计循环，是加速器。同一个动作，结果相反。

他用自己的产品做边界：如果他不自己审查，或完全靠自动循环去修，质量会进下降螺旋。直接提示 Agent 仍然有效，要找的是平衡。两个人可以搭出同一条循环，得到相反的结果。一个用它在自己深懂的工作上走得更快，一个用它躲开理解。循环分不出这两者。Cherny 的意思是杠杆点移动了，工作并没有因此变容易。

去建循环，并且像一个打算继续当工程师的人那样建，而不是只当按下开始的人。

## 笔记

- 和本站 harness 页对照着读：[长时运行应用的 Harness 设计](./harness-design-long-running-apps) 讲单次长任务怎么拆阶段、把状态留在模型外面；这篇讲的是「谁来发起下一轮」。论文侧的源码比较见[编码 Agent 的 Harness 工程](./harness-engineering-paper)。
- 五件套里的 Skill、MCP、子 Agent，分别对得上[Agent Skills](./agent-skills)、[MCP 介绍](./model-context-protocol)和[多 Agent 研究系统](./multi-agent-research-system)。Osmani 的补充是：这些零件要被一个定时的外环串起来，进度写在对话外。
- `/goal` 用另一个模型判断停止，和评测里「制作者不给自己打分」是同一条纪律。见[拆解 AI Agent 评测](./demystifying-evals-for-ai-agents)。
- 原文还链向他写的 harness、编排税、意图债、Agent Skills 和 agentic code review。那些是作者自己的延伸，本页没有展开。

返回 [AI / Agent 阅读清单](./)。
