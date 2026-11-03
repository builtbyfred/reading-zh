---
title: "Model Context Protocol 介绍"
title_en: "Introducing the Model Context Protocol"
description: "MCP 用一套开放协议连接 AI 助手和数据所在的系统，替代逐个数据源的定制集成。"
source: "Anthropic"
source_url: "https://www.anthropic.com/news/model-context-protocol"
date: 2024-11-25
status: "译文"
tags:
  - "MCP"
---

# Model Context Protocol 介绍

**非官方译文。** 官方原文：[Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)（Anthropic · News）。

## 导读

这是 MCP 发布时的产品说明，不是后来的工程深潜。适合在读「怎么写工具」和「用代码执行调用 MCP」之前，先弄清它要统一的是什么：模型与数据源之间那一层反复重做的接口。

原文发表于 2024 年 11 月 25 日，栏目为 Product。

## 译文

今天，他们开源 Model Context Protocol（MCP，模型上下文协议）。这是连接 AI 助手与数据所在系统的新标准，包括内容仓库、业务工具和开发环境。目标是帮助前沿模型给出更好、更相关的响应。

AI 助手进入主流之后，行业在模型能力上投入很大，推理和质量进步很快。但即便最复杂的模型，仍受困于与数据隔离：被困在信息孤岛和遗留系统后面。每一个新数据源都要自己的定制实现，真正连通的系统很难做大。

MCP 针对这个问题。它提供一套通用、开放的标准，把 AI 系统连到数据源，用单一协议替换碎片化的集成。结果是一种更简单、更可靠的方式，让 AI 系统拿到它需要的数据。

### Model Context Protocol

MCP 是一套开放标准，让开发者在数据源和 AI 工具之间建立安全的双向连接。架构直接：开发者可以通过 MCP 服务器暴露数据，或构建连接到这些服务器的 AI 应用（MCP 客户端）。

今天为开发者推出 MCP 的三个主要部分：

- Model Context Protocol 规范和 SDK
- Claude Desktop 应用里对本地 MCP 服务器的支持
- 一个开源的 MCP 服务器仓库

Claude 3.5 Sonnet 擅长快速做出 MCP 服务器实现，组织和个人可以很快把最重要的数据集接到一系列 AI 工具上。为帮助开发者开始探索，他们分享了面向常见企业系统的预置 MCP 服务器，包括 Google Drive、Slack、GitHub、Git、Postgres 和 Puppeteer。

早期采用者如 Block 和 Apollo 已把 MCP 集成进自己的系统。开发工具公司包括 Zed、Replit、Codeium 和 Sourcegraph 正在用 MCP 增强平台：让 AI Agent 更好地取回相关信息，从而理解编码任务周围的上下文，用更少的尝试写出更细、更能用的代码。

Block 首席技术官 Dhanji R. Prasanna 说：在 Block，开源不只是一种开发模式，它是工作的基础，也是一种承诺——做出能推动有意义改变、并作为公共品服务所有人的技术。像 Model Context Protocol 这样的开放技术，是把 AI 连到真实应用的桥，确保创新可及、透明，并扎根于协作。他们很高兴在这项协议上合作，并用它构建智能体式系统，把机械性负担拿掉，让人专注于创造。

开发者不必再为每个数据源维护单独的连接器，现在可以对着一套标准协议来建。随着生态成熟，AI 系统在不同工具和数据集之间移动时可以保持上下文，用更可持续的架构替换今天碎片化的集成。

### 开始使用

开发者今天就可以构建和测试 MCP 连接器。所有 Claude.ai 方案都支持把 MCP 服务器接到 Claude Desktop 应用。

Claude for Work 客户可以开始在本地测试 MCP 服务器，把 Claude 连到内部系统和数据集。他们很快会提供开发者工具包，用来部署可服务整个 Claude for Work 组织的远程生产 MCP 服务器。

开始构建：

- 通过 Claude Desktop 应用安装预置 MCP 服务器
- 按快速入门指南构建第一个 MCP 服务器
- 向连接器和实现的开源仓库贡献

### 一个开放社区

MCP 由 Anthropic 的 David Soria Parra 和 Justin Spahr-Summers 创建。他们承诺把 MCP 做成协作的开源项目和生态，并希望听到反馈。无论你是 AI 工具开发者、想利用已有数据的企业，还是在探索前沿的早期采用者，都邀请你一起构建有上下文意识的 AI 的未来。

## 笔记

- 这篇是发布声明：统一的是「每个模型 × 每套工具都重做一套接口」，不是某一种 Agent 循环。
- 文中的预置服务器（Drive、Slack、GitHub、Postgres 等）后来在[用代码执行调用 MCP](./code-execution-with-mcp)里变成「工具定义会撑满上下文」的具体问题。
- 早期采用者名单（Block、Zed、Replit、Sourcegraph）说明 MCP 从一开始就同时面向企业和编码工具，不只是聊天客户端插件。

返回 [AI / Agent 阅读清单](./)。
