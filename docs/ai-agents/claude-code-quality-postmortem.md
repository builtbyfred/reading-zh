---
title: "Claude Code 质量复盘"
title_en: "Claude Code quality postmortem"
description: "三次产品改动让 Claude Code 质量回退，复盘写清时间线、数字和改回了什么。"
source: "Anthropic"
source_url: "https://www.anthropic.com/engineering/april-23-postmortem"
date: 2026-04-23
status: "译文"
tags:
  - "Claude Code"
  - "评测"
---

# Claude Code 质量复盘

**非官方译文。** 官方原文：[An update on recent Claude Code quality reports](https://www.anthropic.com/engineering/april-23-postmortem)（Anthropic · Engineering）。

## 导读

过去一个月里，一部分用户觉得 Claude 的回复变差了。这篇把原因拆成三次产品改动：默认推理力度、空闲会话里的思考缓存，以及一条限制字数的系统提示；API 和推理层没有受影响。适合在用 Claude Code、Claude Agent SDK 或 Claude Cowork，又想核对质量回退从哪来的人。原文发表于 2026 年 4 月 23 日；文中写明三个问题到 4 月 20 日的 v2.1.116 都已解决，并从 4 月 23 日起为所有订阅用户重置用量限额。

## 译文

过去一个月，他们在查一些报告：对一部分用户，Claude 的回复变差了。这些报告被追溯到三次分开的改动，影响到 Claude Code、Claude Agent SDK 和 Claude Cowork。API 没有受影响。

三个问题到 4 月 20 日（v2.1.116）都已解决。

这篇说明他们找到了什么、修了什么，以及之后会怎么做，让同类问题更不容易再发生。

他们把变差的报告看得很重。他们从不会有意把模型做差，而且当时就能确认：API 和推理层没有受影响。

调查之后，他们认定是三个不同的问题：

1. 3 月 4 日，他们把 Claude Code 的默认推理力度从 `high` 改成 `medium`，用来压掉一部分用户在 `high` 下看到的很长延迟——长到界面看起来像冻结了。这笔交换选错了。用户告诉他们：更希望默认更高的智力，简单 task（任务）再自己调到更低力度。他们在 4 月 7 日改回。这一次影响到 Sonnet 4.6 和 Opus 4.6。
2. 3 月 26 日，他们上线了一个改动：会话空闲超过一小时后，清掉 Claude 较旧的思考，好让用户恢复这些会话时延迟更低。一个 bug 让这件事在该会话剩下的每一轮都继续发生，而不是只发生一次，于是 Claude 显得健忘、爱重复。他们在 4 月 10 日修好。这一次影响到 Sonnet 4.6 和 Opus 4.6。
3. 4 月 16 日，他们在系统提示里加了一条减少啰嗦的指令。它和其他提示改动叠在一起，伤到了编码质量，并在 4 月 20 日撤回。这一次影响到 Sonnet 4.6、Opus 4.6 和 Opus 4.7。

因为每次改动影响的流量切片不同、时间表也不同，叠在一起就像大范围、又不连贯的退化。他们 3 月上旬就开始查这些报告，但一开始很难把它和用户反馈里的正常波动分开；内部用法和评测起初也都没有复现后来认定的问题。

用户不该在 Claude Code 上碰到这种体验。从 4 月 23 日起，他们为所有订阅用户重置用量限额。

### Claude Code 默认推理力度的一次改动

2 月他们在 Claude Code 里发布 Opus 4.6 时，把默认推理力度设成了 `high`。

很快就有用户反馈：Claude Opus 4.6 在 high 力度下有时会想太久，界面看起来像冻结了，这些用户的延迟和 token 用量也高得不成比例。

一般说来，模型想得越久，输出越好。力度档位就是 Claude Code 让用户自己做这个交换的方式：多想一会儿，换更低的延迟、更少撞上用量限额。他们给模型标定力度时，会把这笔交换算进去，在测试时计算（test-time compute）曲线上选出一组点，让人有够用的选择范围。到了产品层，再决定把曲线上的哪一个点当作默认值；这个值会作为 effort 参数发给 Messages API，其余档位通过 `/effort` 提供。

图：按推理力度看的自主编码表现。原图标题是 “Agentic coding performance by effort level”，副标题写明这是 Anthropic 内部的自主 agentic coding 评测。横轴是总 token，纵轴是分数（%）。橙色折线是 Opus 4.7，标了 low、medium、high、xhigh、max；蓝色折线是 Opus 4.6，标了 low、medium、high、max。两条线都随着 token 增加而上升。图见[原图](https://www-cdn.anthropic.com/images/4zrzovbb/website/de3bcf9733b61f57234d8c45e663b1bd48677ea1-3840x2160.png)。

在内部评测和测试里，medium 力度在多数 task 上智力略低，延迟却明显更短。它也没有那种偶尔极长的思考尾延迟，并且有助于让用户在用量限额之内做更多事。于是他们把默认力度改成 medium，并用产品内对话框说明了理由。

图：产品内对话框的截图，界面上标着 Claude Code v2.1.111。标题是建议对 Opus 使用 medium 力度。正文写：力度决定 Claude 完成任务时想多久；多数任务建议用 medium，用来平衡速度和智力，并尽量让速率限额撑住更多使用；需要时用 ultrathink 触发 high。选项是 low、medium、high，其中 medium 标成推荐并被选中，列表顺序是 Medium（recommended）、High、Low。图见[原图](https://www-cdn.anthropic.com/images/4zrzovbb/website/459b2a8a0baa88937eebcbe4566dde4d6cc7f185-3794x2260.png)。

放出去不久，用户开始反映 Claude Code 感觉没那么聪明了。他们做了好几轮界面改动，让当前力度更显眼，提醒人可以改掉默认值：启动时的提示、行内的力度选择器，以及把 ultrathink 加回来。但多数用户仍留在 medium 这个默认值上。

听到更多客户的反馈之后，他们在 4 月 7 日撤回了这个决定。现在所有用户的默认是：Opus 4.7 用 `xhigh`，其余所有模型用 `high`。

### 一次丢掉先前推理的缓存优化

Claude 推理一道 task 时，这些推理通常留在对话历史里。这样后面每一轮，Claude 都能看到自己为什么做了那些编辑和工具调用。

3 月 26 日，他们上线了一个本意是提高效率的改动。他们用提示缓存（prompt caching）让连续的 API 调用对用户更便宜、更快。Claude 发 API 请求时，把输入 token 写进缓存；空闲一段时间之后，提示会被逐出缓存，把位子让给别的提示。缓存利用率他们管得很细（更多做法见[这篇](https://claude.com/blog/lessons-from-building-claude-code-prompt-caching-is-everything)）。

设计本应很简单：如果一个会话空闲超过一小时，恢复时可以清掉旧的思考段落，降低用户接着用的成本。这次请求反正会是缓存未命中，可以从请求里剪掉不必要的消息，减少发给 API 的未缓存 token。然后再恢复发送完整的推理历史。他们用的是 API 头 `clear_thinking_20251015`，加上 `keep:1`。

实现里有一个 bug。思考历史没有只清一次，而是在该会话剩下的每一轮都清。会话一旦跨过空闲阈值，这个进程之后的每一次请求都告诉 API：只保留最近一块推理，丢掉它之前的全部。这还会叠加：如果在 Claude 正在使用工具的中途再发一条后续消息，就会在这个坏掉的标志下开始新的一轮，于是连当前这一轮的推理也会被丢掉。Claude 会继续执行，但越来越不记得自己为什么选择这么做。用户看到的就是健忘、重复，以及古怪的工具选择。

因为后续请求会不断丢掉思考块，这些请求也会变成缓存未命中。他们认为，这就是另一批报告的原因：用量限额掉得比预期快。

图：空闲超过一小时后恢复会话时，设计与实际 bug 的对照。原图标题是 “Resume after idle: intended vs actual”。图下说明写着：这次优化本应在恢复时只清一次思考，结果之后每一轮都在清。左侧是 Intended，右侧是 Actual (bug)，从 Turn 2 画到 Turn 6，中间有一条 “Idle > 1h”。图例是 system、user / tool、thinking (sent)、thinking (dropped by keep:1)、thinking (wrongly dropped)、new this turn。图见[原图](https://www-cdn.anthropic.com/images/4zrzovbb/website/332d9c487bb73c8078686068dcbe1b616720a8dd-3016x1198.png)。

两件不相干的实验，让他们一开始很难复现：一件是只在内部做的、和服务端消息排队有关的实验；另一件是思考内容怎么展示的正交改动，它在大多数 CLI 会话里把这个 bug 压住了，所以他们即使在测外部构建时也没有抓住。

这个 bug 落在 Claude Code 的上下文管理、Anthropic API 和扩展思考（extended thinking）的交界上。它引进的改动穿过了多轮人工代码审查和自动代码审查，也穿过了单元测试、端到端测试、自动验证和内部试用（dogfooding）。再加上它只发生在一个角落情况（放久了的会话），复现又困难，他们花了一周多才发现并确认根因。

调查过程中，他们用 Opus 4.7，对照惹出问题的那些 pull request，回头跑了 [Code Review](https://code.claude.com/docs/en/code-review)。在提供了足以凑齐完整上下文的代码仓库之后，Opus 4.7 找到了这个 bug，Opus 4.6 没有找到。为避免再发生，他们正在落地一项支持：代码审查可以把额外的仓库当作上下文。

这个 bug 在 4 月 10 日的 v2.1.101 里修好了。

### 为减少啰嗦而改的系统提示

他们当时最新的模型 Claude Opus 4.7，相对前一代有一个明显的行为特点：正如发布时[所写](https://www.anthropic.com/news/claude-opus-4-7)，它相当啰嗦。这让它在难题上更聪明，但也会产生更多输出 token。

Opus 4.7 发布前的几周，他们开始为它调 Claude Code。每个模型的行为都略有不同，每次发布之前，他们都会花时间优化给它用的 harness（任务脚手架）和产品。

他们有好几样办法压低啰嗦：模型训练、提示，以及改进产品里思考过程的界面。这些最后都用上了，但系统提示里新增的一处，对 Claude Code 里的智力影响大得不成比例。原文指令是：

```text
Length limits: keep text between tool calls to ≤25 words. Keep final responses to ≤100 words unless the task requires more detail.
```

这句话是：长度限制，工具调用之间的文字不超过 25 个词；最终回复不超过 100 个词，除非 task 需要更多细节。

内部测了好几周，他们跑的那一组评测没有回退。他们因此有了信心，在 4 月 16 日把它和 Opus 4.7 一起发出去。

这次调查中，他们用更宽的一组评测做了更多消融（ablation：从系统提示里删掉一些行，看每一行的影响）。其中一项评测显示，Opus 4.6 和 4.7 都掉了 3%。他们立刻在 4 月 20 日的版本里撤回了这段提示。

### 接下来

为避免这些问题再发生，有几件事他们会换做法。他们会让更大比例的内部员工使用和公众完全一致的 Claude Code 构建；用来试新功能的内部版本仍然单独保留。他们也会改进自己内部用的 [Code Review](https://code.claude.com/docs/en/code-review) 工具，并把改进后的版本交给客户。

他们还会把系统提示的改动管得更紧。Claude Code 的每一次系统提示改动，都会跑一套按模型分开的宽评测，并继续做消融，弄清每一行的影响。他们已经做了新工具，让提示改动更容易审查、也更容易审计。他们另外在 CLAUDE.md 里加了指引，保证只针对某个模型的改动，会被限制在它所针对的那个模型上。任何可能拿智力去做交换的改动，都会加上浸泡期（soak period）、更宽的评测组合，以及逐步放量，以便更早发现问题。

他们最近在 X 上建立了 @ClaudeDevs，用来有地方把产品决定和背后的理由讲透。同样的更新也会发在 GitHub 上集中的讨论串里。

最后，他们感谢用户。用 `/feedback` 命令把问题发给他们的人，以及在网上贴出具体、可复现例子的人，最终让这些问题能被找出来并修好。当天，他们为所有订阅用户重置用量限额。

他们非常感谢这些反馈，也感谢大家的耐心。

## 笔记

- 时间线可以记成三截。3 月 4 日默认力度 `high` 改成 `medium`，4 月 7 日改回，影响 Sonnet 4.6 和 Opus 4.6；改回之后 Opus 4.7 默认 `xhigh`，其余模型默认 `high`。3 月 26 日的缓存优化用 `clear_thinking_20251015` 加 `keep:1`，本应只在空闲超过一小时后清一次，结果该进程之后每轮都清，4 月 10 日 v2.1.101 修复，同样影响这两款 4.6。4 月 16 日那条「工具之间不超过 25 词、最终回复不超过 100 词」的系统提示，在一项更宽的评测上让 Opus 4.6 和 4.7 各掉 3%，4 月 20 日撤回，影响面还包括 Sonnet 4.6。三件事到 v2.1.116 都已解决。
- 内部用法和原有评测一开始都对不上用户报告：流量切片和时间表都不一样，CLI 里「思考怎么展示」的改动又把缓存 bug 盖住了。给齐仓库上下文之后，Opus 4.7 的 Code Review 能找出这个 bug，Opus 4.6 不能。评测没覆盖到的路径，可以对照[拆解 AI Agent 评测](./demystifying-evals-for-ai-agents)。
- 思考块该留在历史里，模型才知道自己为什么做了那些编辑和工具调用；清错了还会连着缓存未命中，他们判断这是用量掉得比预期快的原因。上下文里留什么，见[AI Agent 的有效上下文工程](./effective-context-engineering-for-ai-agents)。
- 事后收紧的是产品流程：更多员工用和公众一致的构建、系统提示按模型做评测和消融、可能牺牲智力的改动加浸泡期和逐步放量，并在 CLAUDE.md 里把模型专用改动限制到目标模型。API 和推理层确认没有被动过；4 月 23 日为所有订阅用户重置用量限额。

返回 [AI / Agent 阅读清单](./)。
