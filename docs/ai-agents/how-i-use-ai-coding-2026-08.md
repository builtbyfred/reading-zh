---
title: "我怎么用 AI 编程 2026.08"
title_en: "How I use AI for programming, August 2026"
description: "陈成 2026 年 8 月的用法笔记：并发打磨设计、并行审查，以及用定时 Skill 管一排项目。"
source: "陈成（chenchengpro）"
source_url: "https://x.com/i/article/2092608649403252736"
date: 2026-08-26
status: "摘要"
tags:
  - "Agent"
  - "Claude"
---

# 我怎么用 AI 编程 2026.08

**非官方译文。** 原文：[我怎么用 AI 编程 2026.08](https://x.com/i/article/2092608649403252736)（陈成 · X Article · 2026-08-26）。帖子：[x.com/chenchengpro/status/2092608785584115811](https://x.com/chenchengpro/status/2092608785584115811)。作者简介为 engineering at Qoder，并创建了 umi、dva、mako 和 neovate code。

## 导读

陈成隔一段时间写一篇「我怎么用 AI 编程」。这一篇距上一篇两个月，他把变化收成一个词：并发。打磨设计从串行问五遍，变成一次问 n 个 Agent；审查从跑一轮，变成并行跑 n 个模型；项目从盯一个，变成在 Herdr 里管一排。

适合想看一个每天用编码 Agent 交付的人，怎样把设计、实现、审查和定时任务拆开的读者。文中的工具名（Qoder CLI、Herdr、Helm、QoderWake 等）是他当时的选择，不是通用建议。原文有若干截图，本页不转载。

## 摘要

### 工具

主工具是 Qoder CLI 和 Claude Code。他写两者大部分能力是对齐的，切换不费力，用不同模型时换不同工具即可。

和新的一点是：用主 Agent 去指挥其他 Agent。对抗性审查会用到 Codex、Agy 和 Grok Build。不同模型和 Agent 各有人设。文中的分法是：Grok 限制少，拿来做逆向和翻译书；Codex 配他写的 sol 5.6 fast 最稳；Agy 加 Flash 用来兜底。

### 研发流程

全流程的节点是 Brainstorm、Save Design、Improve Design、Impl、Review。节点是原子的，好按场景重组。

他觉得能写出较高质量代码的正式流程有两种：侧重设计，或侧重审查。他自己倾向前者，大约九成时间打磨设计，一成时间实现，用来减少返工。提交会附上设计，存在仓库里，或以链接放在 PR 上，方便审查者看到细节和每个决策点。

和很多人不同的是中间那个 Improve Design。以前的做法用了半年多：串行问最多五遍「对这份设计还有什么改进建议」。最近太慢，改成一次并发问 n 个 Agent 同一个问题，整体快了不少。

具体用哪一种流程，他按场景、功能大小、重要程度，以及自己熟不熟来定。

- 偏 vibe 的项目或很小的功能：简单分析后直接要求实现。
- 在 Qoder CLI 的研发里，大部分需求是先把需求和方向讨论清楚，然后要求保存设计、改进、实现。流程里已经有机器人审查和人工审查，所以一般不再自己跑一轮审查。
- 核心改动或自己拿不准的改动：跑 1 到 n 轮审查，每一轮并行跑 n 个不同的 Agent 和模型。

### 编排

前面是怎样做好一个需求。编排是怎样做好一批需求或整个项目。

上半年他自己做了 Helm。其中一个功能是基于 issue 做研发，他当时用着舒服，一天能做 70 到 100 个 PR。后来工作重心调整，需要并行的研发变少，研发以外的事变多，Helm 就荒了。

最近改用 Herdr，用它的 workspace 管不同项目。他越来越觉得这类基于 hook 的 Agent 管理工具好用：内置终端保住了原工具的全部能力。对照是上半年做 Helm 和 Neovate Desktop 时，为了对齐 Claude Code 的能力，在 UI 层花了很多力气。

本地和远程机器上还有 n 个循环。它们基于 Skill 做定时任务，跑在 QoderWake 上。他倾向把事情做进 Skill，本地建了很多，每天都在新建和完善。其中和 Qoder CLI 相关的有 17 个，覆盖竞品、反馈、数据、回顾和写作。这些循环不断给他新的需求来源，于是 Agent 干的活越多，他自己越忙。一天的开始不是打开编辑器，而是看机器人昨晚做了什么。文中举的节奏是：9 点竞品日报先到，9 点半用户反馈分类完毕，其中几条已经变成 issue 排进队列。

从这篇的前一晚起，他在看 Robobun，也就是 bun 仓库里的机器人。它基于 GitHub workflow。他提了一个 issue，觉得处理顺畅，合并率也高，尽管很多团队有类似的东西。当天下午他开始做复刻：基于 GitHub 或 GitLab 做 issue 处理、自动 PR / MR、自动响应审查、自动处理 mention，以及自发的治理任务流。

### 周边

他已经想不起上一次认真打开编辑器是什么时候。编辑器的一些配套仍然需要，于是换了轻的方案：Hunk 用来看 diff，Moeka 用来看和改 Markdown。下一篇他预计还是两个月后。

## 笔记

- 「并发问 n 个 Agent 来改进同一份设计」和「写的人与查的人分开」是同一纪律的两种用法。对照 [循环工程](./loop-engineering) 里的子 Agent 核验，以及 [构建高效的 AI Agent](./building-effective-agents) 里的编排者–工作者。陈成这里的并发首先用在设计，其次才用在审查。
- 定时 Skill 把他的早晨从编辑器改成读机器人留下的 issue。这和 Osmani 写的「人设计循环，循环去提示 Agent」是同一种作息，工具换成了他自己的 QoderWake 和 Skill。
- 本页依据是 2026-08-26 的 X Article 全文结构。原文配图在 X 上，这里不转载。未登录直接抓取 x.com 会 403。

返回 [AI / Agent 阅读清单](./)。
