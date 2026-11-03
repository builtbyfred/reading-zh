---
title: "编码 Agent 的 Harness 工程"
title_en: "Harness Engineering: Anatomy, Architecture, and Evolution of Coding Agents"
description: "Barbaste 等人对十一套编码 harness 做源码解剖：七个子系统、两处共同缺失，以及从工具变成平台。"
source: "Paul Barbaste, Tristan Darrigol, Germain Vu, Tom Wiltberger"
source_url: "https://arxiv.org/abs/2609.00006"
date: 2026-07-15
status: "摘要"
tags:
  - "harness"
  - "Agent"
---

# 编码 Agent 的 Harness 工程

**非官方译文。** 原文：[Harness Engineering: Anatomy, Architecture, and Evolution of Coding Agents](https://arxiv.org/abs/2609.00006)（arXiv:2609.00006，2026-07-15）。作者为 Paul Barbaste、Tristan Darrigol、Germain Vu、Tom Wiltberger。论文页脚署 Barbaste 同时属于 Inclusive Brains 与 Wavestone AI Lab，其余作者署 Wavestone AI Lab。PDF 在 [arXiv](https://arxiv.org/pdf/2609.00006)。

## 导读

这篇给 harness（任务脚手架）一个可以对照源码的定义。Agent 等于模型加上 harness：模型提供智能，harness 是除此之外的运行时，用循环、工具、上下文、安全控制、编排和扩展面把模型接到世界上。作者不打分、不排名，只解剖十一套生产编码 harness 在 2026 年 7 月的钉死版本，并拿一套元 harness 当对照。

适合已经把「换一个更强的模型」当成默认杠杆、想看生产系统实际把工程量花在哪里的人。论文自述 83 页，是 2026 年 4 月一版研究的扩充第二版。本页按论文结构写摘要，不收录文末那份约 90 行的最小 harness 脚手架。

## 摘要

### 研究对象和论点

语料是四家模型厂商的旗舰，加上七个开源系统：Claude Code（Anthropic，文中依据的是流通中的源码快照）、Codex CLI（OpenAI）、Gemini CLI（Google）、Mistral Vibe（Mistral）、OpenHands、Aider、Mini-SWE-Agent、Hermes（Nous Research）、Pi、OpenCode、OpenClaw。第十二个系统 Omnigent（Databricks，2026 年 6 月开源）是作者所知的第一个 meta-harness（元脚手架）：它编排别人的 harness，自己不实现编辑循环，所以只作对照，不放进七个子系统的打分。

其中八套在 4 月那一版里已经审计过。作者保留旧快照再和 7 月的版本做源码 diff，于是有一个约一个季度的纵向样本。

论点收在 2026 年上半年：编码 harness 从工具转成了平台。harness 变成可导入的 SDK，框架厂商则开始自己发 harness；出现了市场、切换成本工具和企业治理层；Agent 可以被当成一个兼容 OpenAI 接口的模型来寻址；元 harness 在一个 API 后面编排多家厂商的 harness，贵的部分自己重做，专有的部分拿来套利。

作者声明七项贡献：学科的参考解剖、十一套系统的源码比较、13 条横切观察和 29 个反复出现的模式、纵向分析、两处经验上的缺失、平台转向，以及 18 条钉在观察上的设计建议加一份最小脚手架。全文不评测、不排名。

### harness 是什么，不是什么

定义写成一句代数：Agent = Model + Harness。术语在 2026 年初进入流通：Mitchell Hashimoto 先顺口用过，再由 Trivedy 在 LangChain Deep Agents 的上下文里定义。作者采用 Macedo 的核心——包住语言模型、使它能在仓库上行动的那一层——再用七个子系统把它落到生产代码上。

四个容易混的边界：

- **脚手架（scaffold）** 近义。有用的时候，scaffold 指结构代码（循环、注册表），harness 指发出去的运行时。Mini-SWE-Agent 的脚手架大约 100 行 Python；Claude Code 的 harness 是带终端 UI、权限和插件生态的产品。
- **Agent 框架** 是开发者导入、用来造 Agent 的库。harness 是开发者在里面工作的运行时。这个界限在 2025 年还清楚，2026 年从两边一起溶解。
- **评测 harness** 包住 Agent 去跑任务。Agent harness 包住模型让它行动。同一个词，包裹方向相反。本站[拆解 AI Agent 评测](./demystifying-evals-for-ai-agents) 用的 harness 更接近评测这一侧，读的时候要分开。
- **编排器 / 元 harness** 从上面协调一个或多个 harness，自己没有编辑循环。

### 七个子系统

从约 100 行的研究基线到百万行级的产品 CLI，每套系统都要在同样七件事上选一个立场，故意不做也是一种立场。作者给每一件标了语料里见到的最小和最大形态。下表是本页的压缩，原文 Table 1 更全。

| 子系统 | 做什么 | 语料里偏小的一端 | 语料里偏大的一端 |
| --- | --- | --- | --- |
| Agent 循环 | 推理和动作交替，拥有停止条件和失败恢复 | Mini-SWE-Agent：一个 bash 工具上的线性 while | OpenHands：持久事件日志上的事件溯源对话，可并行一批动作 |
| LLM 接入 | 讲厂商协议，组装提示，管缓存、思考和路由 | Mini-SWE-Agent：一次 LiteLLM 调用、一份模板 | Hermes 多套自有传输和数十个厂商配置；Codex 由服务端下发模型目录 |
| 工具与动作 | 定义并执行 Agent 能做的事，尤其是改文件 | 只有 bash | Claude Code 数十个可延迟加载的定型工具；Codex 把工具调用当代码执行 |
| 记忆与上下文 | 分配窗口，跨轮次和会话留下知识 | 无界的线性历史 | Codex 由 Agent 维护的跨会话记忆；Gemini CLI 基于图的上下文蒸馏 |
| 安全与权限 | 决定什么能跑、什么要问、什么禁止，并隔离执行 | 成本和步数上限 | Codex：策略规则、LLM 审批，加上三平台 OS 沙箱 |
| 编排 | 派生子 Agent，连接其他 Agent | Aider 故意没有，单 Agent | Claude Code 可递归组合；Omnigent 在元层做跨厂商协调 |
| 扩展 | 配置、hooks、Skill、插件、MCP | 结构类型（Python protocol） | Pi 把一切做成扩展；Codex 用市场上架的插件 |

旁边还有两张横切的面：人与程序用来驱动 harness 的界面层（TUI、CLI、IDE 协议、HTTP、SDK），以及多套子系统共享的会话底子（记录、持久化、恢复与分叉）。

最小端说明地板很低。Mini-SWE-Agent 用大约 100 行覆盖七个子系统：一个 while、一份模板、一个工具、一份消息列表、两个上限、不做编排。它自报的 SWE-bench Verified 成绩和大三个数量级的系统落在同一档。作者把这个数字标成自报、模型和日期都不同，见方法学保留。地板低这件事在保留之后仍然成立。把地板和生产系统分开的，是安全、恢复、成本、扩展，以及后来的平台表面。

### 两处缺失，以及其他反复出现的观察

大约四百万行 Python、TypeScript 和 Rust 里，有两件文献里很中心、这十一套运行时里都没有的东西，而且在语料扩大约三倍、又复审一个季度之后仍然成立：

- 没有一套 Agent 运行时导入通用 Agent 框架（LangChain、LangGraph、AutoGen，以及作者核对过的其他多个；Gemini CLI 也没用 Google 自己的）。循环是用宿主语言的异步原语手写的。
- 没有一套用向量嵌入在代码上做检索。代码检索靠 ripgrep、tree-sitter、glob，以及自动发现的 Markdown 上下文文件。对话级回忆的生产答案是词法搜索（Hermes 的 SQLite 全文检索）；只有 OpenClaw 的一个默认配置把混合嵌入用在聊天历史上，仍然不用在源码树上。

其余观察里，和读本站其他篇最相关的几条：

- **循环的精致程度不能预测成绩。** 十一套系统代码量差三个数量级，面对的是同类任务。生产系统的体积大多花在与「做完任务」正交的地方：安全、体验、扩展，以及越来越多的客户端和传输。
- **改文件的策略很影响改码是否准确。** 前沿模型一侧收敛到精确的唯一子串替换；要覆盖更弱模型的一侧用模糊级联。用行号改，模型比按上下文匹配更容易漂。
- **持久记忆取代 compaction（上下文压缩），成为上下文工程的前沿。** 压缩本身在收敛：十一套里七套用阈值触发的 LLM 摘要，并且越来越做成增量合并。拉开差距的是记忆怎么写：Agent 自己维护、人来放行、模型直接写但有界，或在回合开始前由子 Agent 回忆。
- **OS 级沙箱是贵的，而且是选择。** 体量和「有没有原生沙箱」对不上。有的大系统把安全预算花在内容侧威胁和命令策略上，并明确拒绝一个容易被误当成安全边界的进程内半套沙箱。
- **编排者–工作者在多套系统里独立出现**，包括四家厂商原生系统和若干开源实现。Pi 是反例：生产级的软件工程 harness 可以故意保持单 Agent，把子 Agent 留在扩展里。
- **Skill 的采用超过 MCP。** 十一套里 9 套实现 `SKILL.md`，8 套实现 MCP。延迟加载接近普遍；出现了注册表、信任分级，以及语料里第一批由 Agent 自己编写的 Skill。
- **Anthropic 2024 年底到 2025 年的 Effective Agents 系列**（工作流对 Agent、上下文工程、工具、多 Agent）和四家厂商原生系统里看到的架构对得上。这是共享的经验、公开指南的影响，还是两者都有，作者留成开放问题。本站[构建高效的 AI Agent](./building-effective-agents) 起的几篇就是这条系列。
- **ACP 在十一套里的六套出现**，角色从编辑器对接，扩到「harness 托管」：OpenHands 可以把 Claude Code、Codex 或 Gemini CLI 当成可替换的后端。系统内部的子 Agent 大多仍走进程内原语，不走这套对外协议。

纵向 diff 里，收敛变成了模仿：Codex 逐字采用 Claude Code 的 hook 词汇，并提供会话和设置的导入器；OpenHands 读取 Claude Code 的插件格式。行为策略从提示词散文迁到配置。4 月那一版里有三条观察，到这一版被作者就地做了实质修订。

### 平台转向

2026 年上半年，竞争单位从 Agent 循环挪到循环周围的生态表面。作者在源码里点名的层次包括：hooks、Skill、插件这些扩展基底在生产系统之间收敛；能力分发有了市场、注册表、信任分级和 Agent 作者；厂商为彼此的磁盘状态做导入器，并出现 MDM 一级的治理；harness SDK 和框架做出来的 harness 合成同一形状；Agent 本身可以放在一个兼容 OpenAI 的端点后面被寻址；Omnigent 在一个 API 后编排十一套厂商 harness（本文语料占其中一半），沙箱和策略自己重做，hooks 和会话存储则沿用各家专有实现。

相关工作一节还勾了 2026 年 7 月的更广地图（Copilot CLI、Kiro、Grok Build、Cursor CLI、OpenCode、Hermes、Pi、Goose 等）。作者写明：这一小节的行业事件来自公告、发布说明和仓库元数据，截止 2026-07-10，**不像语料内的主张那样做过源码核对**。读星数、收购和停服日期时，按这个保留来读。

### 给做新 harness 的人的建议

第 16 节把观察收成 18 条建议，每条点明支撑它的观察、实现它的系统，以及可以不这么做的代价。本页只留分组后的方向，不逐条照录，也不收录文中那份约 90 行的 Python 脚手架。完整条文和代码在原文第 16 节。

- **循环**：从线性 while 开始。等到一轮上有多条彼此正交的策略（步数、成本、自动压缩、只读）时，再收成中间件管道。
- **厂商耦合**：自己有基础模型，就紧贴自家，并留一个通用回退；自己没有，仍可以为缓存断点、思考档位做按模型的条件代码，成本是集中维护这一层。
- **工具**：从 bash 起步，按观察到的失败再加工具。工具数超过大约 15 个，再做延迟加载。
- **改文件**：前沿模型用精确的唯一子串替换；更弱的模型用模糊级联。漂移在工具里处理，不用行号。
- **记忆**：自动发现项目、用户和扩展三层的 Markdown 上下文，顶层靠近系统提示注入，嵌套文件在工具碰到对应子树时再 JIT（即时加载）读入。压缩用固定缓冲区下的阈值触发，保留最近一段原文，摘要增量合并，溢出时同一套例程再触发。代码检索用 ripgrep、glob、tree-sitter，不建向量库。
- **安全**：开发者工具用分级审批（计划 / 默认 / 放行）和权限范围。企业、共享和自动化场景用 OS 级沙箱、策略即代码，以及按 Agent 的审计。放行模式下面留一层翻不掉的底。规则做成数据或策略文件。
- **多 Agent**：能指出一段「并行隔离的上下文明显优于串行搜索」之前，保持单 Agent。对外提供 ACP 服务器，让编辑器和元编排器能消费你；自己的子 Agent 留在进程内。
- **扩展**：Skill 放能力模板（工作流、领域知识、操作步骤），MCP 放外部集成，优先顺序是 Skill 在前。第三方 Skill 按包来对待：信任分级、扫描、隔离。
- **明确不要做的**：不要用通用 Agent 框架当运行时（作者列了 LangChain、LangGraph、AutoGen、CrewAI 等；2026 年的推论是，若要带电池的起点，用已经内置这些模式的 harness SDK）；不要为代码建向量检索；不要把每个上游 API 一对一包成工具；卡死检测不必过度工程，便宜的上限（连续畸形响应、墙钟时间）值得做。

作者在讨论里也写了最小主义：任务完成的地板低，生产系统的质量差在安全、恢复和平台面上。威胁与有效性见第 15.6 节，自报的基准数字都带了这个保留。

## 笔记

- 这不是 OpenAI 的那篇博文。Ryan Lopopolo 在 2026-02-11 写的 [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/) 讲的是一个内部产品：人只做引导，应用、测试、CI 和文档都由 Codex 写，仓库知识放在结构化的 `docs/` 里，`AGENTS.md` 只做目录。那是「怎么用 harness 干活」的实践记录。本篇是「harness 由什么组成、十一套源码怎么分化」的论文。两篇用同一个词，对象不同，可以对照，不要并成一篇。
- 本站[长时运行应用的 Harness 设计](./harness-design-long-running-apps) 是 Anthropic 工程文，讲长任务怎么拆阶段。[循环工程](./loop-engineering) 在单次 harness 外面再加定时和磁盘状态。读的顺序可以是：先分清评测 harness 和 Agent harness，再看这篇的七个子系统，然后看 Osmani 的外环。
- 论文第 3.6 节把本站核心必读里的四篇（有效 Agent、上下文工程、为 Agent 写工具、多 Agent 研究系统）当作厂商指南基线，用来对照源码。Observation 10 只说「对得上」，没有声称是因果。
- 摘要依据是 arXiv 摘要页与 HTML 全文的结构（abs 2609.00006，发表日 2026-07-15，评论写明 83 页、第二版）。90 行脚手架留在 PDF / HTML 原文，这里不转载。

返回 [AI / Agent 阅读清单](./)。
