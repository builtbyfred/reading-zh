---
title: "设计 MCP Gateway：Uber 的 MCP 管理平台"
title_en: "Designing MCP Gateway: Uber's MCP Management Platform"
description: "Uber 用 Registry 做控制面、Proxy Gateway 做数据面，把内部 API 收成默认关闭的 MCP 工具。"
source: "Uber Engineering"
source_url: "https://www.uber.com/us/en/blog/designing-mcp-gateway/"
date: 2026-10-01
status: "摘要"
tags:
  - "MCP"
  - "Agent"
---

# 设计 MCP Gateway：Uber 的 MCP 管理平台

**非官方译文。** 原文：[Designing MCP Gateway: Uber's MCP Management Platform](https://www.uber.com/us/en/blog/designing-mcp-gateway/)（Uber Engineering · 2026-10-01）。作者署名为 Alok Srivastava、Deepanshu Mehndiratta、Gaurav Gill，文末还致谢多位同事。

## 导读

团队各自接 MCP（Model Context Protocol，模型上下文协议）能让 Agent 碰到真实业务数据，规模上来以后就会碎：工具难发现、难运维，还绑在某一个服务或某一个 Agent 上。Uber 的回答是一个公司级网关，把已有的 HTTP、gRPC 和 TChannel API 收成统一的 MCP 工具。

适合要在很多服务上给 Agent 提供工具、又不想让每个团队各写一套服务器的人。文中的数字是他们自己的运行规模：网关托管 800 个以上 MCP 服务器、5000 个以上工具。发现不等于暴露，工具默认关闭。

## 摘要

### 为什么要一个网关

早期各团队用 MCP 把 Agent 接到代码、数据和操作系统，Agent 一旦能查内部服务、替用户做有意义的动作，能力明显上去。采用加快之后，集成是各写各的：工具难发现，运行不可靠，和具体服务或 Agent 实现绑死。几百个团队都在试 Agent 工作流时，没有统一架构，MCP 会把运维复杂度、安全风险和开发摩擦一起放大。

他们要的平台要做三件事：抹平 HTTP、gRPC 和 TChannel 的协议差；安全与可观测一致；工具容易创建、发现和复用。MCP Gateway 是位于 AI Agent 与既有后端、以及原生 MCP 服务器之间的编排和路由层。现有 API 可以暴露成 MCP 工具，在一处治理，被多个 Agent 以同一方式消费。文中写道，它因此成为 Uber 内部做 AI Agent 的一条可扩展路径，当时托管超过 800 个 MCP 服务器、超过 5000 个工具。

博文按三块写：把 MCP 译到现有协议的代理层，MCP Registry 与 API 爬取组成的发现层，以及编写侧的控制面。

### 控制面是 Registry，数据面是 Proxy

网关是微服务。两个主件：

- **MCP Registry（控制面）** 保存目录：几百个由内部服务支撑的 MCP 服务器，以及几千个工具。工具从「不写代码、把现有 API 暴露出来」到「按 MCP 规范原生实现」都有。目录是发现、所有权和启用的单一事实来源。
- **Proxy Gateway（数据面）** 在运行时执行 MCP 请求。它把 MCP 调用译成 HTTP、gRPC 或 TChannel，转到对应后端，再把响应译回 MCP。底下的服务不用为了 Agent 改接口。

### AutoCrawler：从 IDL 和心跳里发现，并且默认关闭

Uber 有几千个内部服务，让每个团队手写 MCP 服务器太慢。AutoCrawler 是跑在 Cadence 上的分布式工作流，订阅 IDL 注册表和内部服务信号。cron 按固定节奏触发一次扫描，找新服务、新 API 和 schema 变化。对每个发现的实体，它创建或更新 MCP 服务器表示，生成或取回工具定义和 schema，并**以默认关闭的状态**登记进 Registry。发现因此可以铺到几千个服务上，服务团队不在关键路径上。

**IDL 支撑的服务**（Protobuf 或 Thrift）按服务 API 组走这条路径：upsert 一个对应的虚拟 MCP 服务器；解析方法名、请求响应 schema 和注释；用 LLM 生成更适合 Agent 的工具描述；把 Protobuf 或 Thrift schema 译成 MCP 可用的 JSON-RPC 2.0 schema；再把工具以默认关闭登记或更新。

**原生 MCP 服务器**用他们的 MCPFx 框架来写，工具是按 Agent 优化过的。每个原生服务器打心跳表示自己在、并且就绪。AutoCrawler 看到心跳后，对它做一次 `listTools`，取回工具和 schema，再在 Registry 里建一个包含这些工具的虚拟代理服务器，同样默认关闭。

### 第三方服务器

网关也编排 Jira、Google 这类第三方集成。两边配合：网关把调用方的用户令牌向下游传，同时做授权、限流和敏感数据脱敏；第三方 MCP 服务再把内部用户令牌换成对应的第三方令牌，然后打到外部 MCP 服务器。

### 编写和启用：发现不等于暴露

服务器可以不经服务团队之手被创建出来，所有权必须留在服务团队。每台服务器、每个工具从关闭状态开始，要由拥有团队显式审查并打开。负责人可以先改生成出来的工具定义再启用。工具描述的每次变更都走配置 diff，由服务器负责人批准、部署，需要时回滚到上一版。

### 数据面怎么执行

数据面按固定节奏从控制面刷新内存里的服务器和工具配置，启用和描述变更不用重启就生效。它按配置物化虚拟 MCP 服务器。每个虚拟服务器暴露一个 `/<service-name>/mcp` 入口，请求经内置代理服务器落到对应 handler。

每个 server handler 知道工具，也知道下游。安全上，网关对所有服务器做工具粒度的授权和脱敏：用 Uber 内部访问控制系统，按识别到的调用方（人、服务、Agent）套不同的 charter 策略。策略建在服务器级，需要时可以按工具覆盖。工具响应里的 PII 和敏感数据有开箱的脱敏。

IDL 支撑的下游：handler 在内存里记着目的地（HTTP 端点，或 gRPC / TChannel 过程）。请求到来时，把 JSON 译成对应的线上格式，序列化成 Protobuf 或 Thrift，转发，再把字节响应译回 MCP JSON。真正的下游调用走 Muttley，也就是每台后端旁边的服务网格 sidecar。网关因此直接用上已有的服务间路由。

原生服务器在 Registry 里同样是虚拟服务器。运行时请求被透明地代理到原来的服务器，响应再代理回来。

网关带来的好处，文中归成四条：容易发现和安装；现有 API 可以不写代码就变成工具；安全和可观测是内建的；所有权和治理集中。

### 规模上来之后：上下文装不下整本目录

几百个服务器、几千个工具之后，出现小规模没有的问题：上下文膨胀和成本。MCP 没有跨服务器搜索。Agent 得先知道去问哪一台，才能问它有哪些工具。把几百个服务器的 URL、凭证和工具列表都配进 Agent，会吃掉上下文上限。他们用三件事处理。

**Omni MCP** 是一台代理服务器，让客户端用渐进发现碰到网关里的任意服务器，从而少往上下文里塞定义。它暴露四个工具：`discover_server`（按意图找服务器）、`discover_tools`（查一台服务器的工具）、`get_tool_schema`（取某个工具的 JSON schema）、`invoke_tool`（调用）。访问控制和网关的其余能力仍然包在里面。

**Response Projection（响应投影）** 是一种类似 GraphQL 的调用方式。网关在工具请求 schema 里注入一个字段，让调用方声明只要哪些嵌套路径。LLM 填上这些路径，网关在运行时把响应裁到这些字段。他们用这个把企业级 API schema 收进 MCP 还能用的体积。

**Code Mode** 面向在 shell 里工作的编码 Agent：把工具输出写进文件，比把整段响应灌进模型上下文更省。它通过 aifx（Uber 给 Agent 操作用的 CLI）走网关，机器上不必安装 MCP 服务器，上下文里也不必先有工具定义。三条命令：`aifx mcp list`、`aifx mcp search`、`aifx mcp call`。Agent 可以串在一条命令里，把输出写入文件，再用文件系统上的检索只把需要的片段读回上下文。文中说 Code Mode 已是公司里编码 Agent 使用 MCP 工具的默认方式。

### 他们想让别人带走的判断

收尾时作者把设计收成一句：给 Agent 提供工具，最快的办法是现有 API。网关在服务所在的地方接上它们，经 Muttley 把 HTTP、gRPC 和 TChannel 译成 MCP，下游零改动。在规模上做 Agent 系统，难的是让 Agent 值得信任的那层结缔组织：发现、安全和可靠性。

## 笔记

- 「工具定义会撑满上下文」在本站已有两篇对照：[用代码执行调用 MCP](./code-execution-with-mcp) 把定义留在代码侧；[进阶工具使用](./advanced-tool-use) 讲按需找工具。Uber 的 Omni MCP 和 Code Mode 是同一压力在企业内部目录上的做法，目录规模是他们写的 800+ 服务器 / 5000+ 工具。
- 默认关闭、负责人审批配置 diff，是发现层和暴露层分开。这和「写好工具描述」不是同一件事：描述可以由爬虫加 LLM 生成，打开与否由服务拥有者决定。
- 博文有五张架构图（网关把 API 当工具、AutoCrawler、Registry UI、工具 UI、数据面六层）。图在原文，本页不转载。
- gRPC 在原文脚注里标明是 The Linux Foundation 的商标。封面图作者注明由 ChatGPT 生成。

返回 [AI / Agent 阅读清单](./)。
