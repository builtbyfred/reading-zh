---
title: "扩展托管 Agent"
title_en: "Scaling Managed Agents"
description: "用稳定接口把会话、harness 和沙箱拆开，长时程 Agent 才能被托管，底下的实现可以换。"
source: "Anthropic"
source_url: "https://www.anthropic.com/research/managed-agents"
date: 2026-04-08
status: "译文"
tags:
  - "托管 Agent"
---

# 扩展托管 Agent

**非官方译文。** 官方原文：[Scaling Managed Agents](https://www.anthropic.com/research/managed-agents)（Anthropic · Research）。

## 导读

托管 Agent 把一次请求里搅在一起的三件事拆开：session（会话）是只追加的事件日志，harness（任务脚手架）是调用模型并转交工具的循环，sandbox（沙箱）是跑代码、改文件的执行环境。模型变强以后，写进 harness 的假设会过时，所以接口要稳，底下的容器和循环都可以换。适合已经在做长时程 Agent、又被会话丢失、凭证进沙箱或首 token 延迟卡住的人。原文发表于 2026 年 4 月 8 日，页内标题是「把大脑和手拆开」。

## 译文

先按[文档](https://platform.claude.com/docs/en/managed-agents/overview)用上 Claude Managed Agents。

工程博客上一条持续的线索，是如何[构建高效的 Agent](https://www.anthropic.com/engineering/building-effective-agents)，以及如何为[长时间运行的工作](https://www.anthropic.com/engineering/harness-design-long-running-apps)[设计 harness](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)。这些工作有一条共同的线：harness 把「Claude 自己做不到什么」编码成假设。这些假设要经常拿出来问，因为模型一变好，它们就会[过时](http://www.incompleteideas.net/IncIdeas/BitterLesson.html)。

只举一个例子。先前的工作里[我们发现](https://www.anthropic.com/engineering/harness-design-long-running-apps)，Claude Sonnet 4.5 感觉到上下文快到上限时，会提前把任务收掉。这种行为有时被叫做「context anxiety」（上下文焦虑）。当时的办法是在 harness 里加上下文重置。同一套 harness 用到 Claude Opus 4.5 上，这个行为没有了。重置变成了死重。

他们预期 harness 还会继续变。所以做了 Managed Agents：Claude 平台上的一项托管服务，替你跑长时程 Agent，只露出一小套接口。这套接口要活得比任何一种具体实现都久，包括他们今天正在跑的那些。

做 Managed Agents，就是在解一个老的计算问题：怎样为一个「[还没被想到的程序](http://www.catb.org/esr/writings/taoup/html/ch03s01.html)」设计系统。几十年前，操作系统把硬件虚拟成抽象——进程、文件——这些抽象宽到足以装下当时还不存在的程序。抽象比硬件活得久。`read()` 不在乎底下是 1970 年代的磁盘组，还是现在的固态硬盘。上面的抽象保持稳定，下面的实现可以随便换。

Managed Agents 走同一条路。他们把 Agent 的部件虚拟化了：会话（发生过的一切的只追加日志），harness（调用 Claude、并把 Claude 的工具调用转到相应基础设施的循环），以及沙箱（Claude 可以跑代码、改文件的执行环境）。每一块的实现都可以换，另外两块不受打扰。他们坚持的是这些接口的形状，不是接口后面跑的是什么。

![harness 居中，分别连着 Session、Sandbox、Tools（含 Resources / MCP）和 Orchestration](https://www-cdn.anthropic.com/images/4zrzovbb/website/903b624ada206b10753a24c6a1367e74a869165d-1080x1080.png)

图：harness 在中间。左侧是 Session，右侧是 Sandbox，上方是 Tools（加上 Resources / MCP），下方是 Orchestration。实线和虚线表示两边来回调用。原文未附图注。

### 别养一只宠物

一开始，他们把 Agent 的全部部件放进同一个容器：会话、Agent harness 和沙箱共用一个环境。好处是有的。改文件就是直接的系统调用，也没有服务边界要设计。

把所有东西耦进一个容器之后，他们碰上了一个老的基础设施问题：养了一只[宠物](https://cloudscaling.com/blog/cloud-computing/the-history-of-pets-vs-cattle/)。在「宠物对牲畜」这个比方里，宠物是有名字、要亲手照料、丢不起的那一个；牲畜则可以互换。在他们这里，服务器变成了那只宠物。容器一挂，会话就没了。容器不应答，就得把它护理到恢复。

护理容器，意味着去调试卡住、不应答的会话。唯一的窗口是 WebSocket 事件流，可它说不出故障出在哪。于是 harness 里的 bug、事件流上的丢包、容器下线，看起来都一样。要弄清出了什么事，工程师得在容器里开一个 shell。那个容器里常常还有用户数据，这条路等于让他们没法调试。

第二个问题是：harness 假定 Claude 正在处理的东西就住在同一个容器里。客户要求把 Claude 接到他们自己的虚拟私有云（VPC）时，要么把网络和 Anthropic 的网络做对等互联，要么把 harness 跑在客户自己的环境里。写进 harness 的一条假设，到了要接不同基础设施的时候，就变成了问题。

### 把大脑和手拆开

他们走到的解法，是把当时心目中的「大脑」（Claude 和它的 harness）从两样东西上拆开：一样是「手」（真正做动作的沙箱和工具），一样是「会话」（会话事件的日志）。每一块都变成一个接口，对另外几块几乎不做假设，也可以各自失败、各自替换。

#### harness 离开容器

把大脑和手拆开，意味着 harness 不再住在容器里面。它调用容器的方式，和调用任何别的工具一样：`execute(name, input) → string`。容器变成了牲畜。容器死了，harness 把这次失败当成一次工具调用错误接住，交回给 Claude。Claude 如果决定重试，可以用一份标准配方重新拉起一个新容器：`provision({resources})`。失败的容器不必再被人护理回健康状态。

#### 从 harness 故障里恢复

harness 也变成了牲畜。会话日志放在 harness 外面，harness 里没有任何东西需要挺过一次崩溃。一个 harness 挂了，可以另起一个，用 `wake(sessionId)` 唤醒，再用 `getSession(id)` 把事件日志拿回来，从最后一条事件接着跑。Agent 循环进行时，harness 用 `emitEvent(id, event)` 写入会话，好把事件留下一份持久记录。

![各组件的接口伪代码，以及什么样的实现能满足它](https://www-cdn.anthropic.com/images/4zrzovbb/website/73e900af5b9d6ed8c64db0a8e74d4465963556b7-1640x1596.png)

图：接口一览。原文是一张图，没有图注。下表按图中文字译出，标识符保持原样，注释译成中文。

| 组件 | 接口（伪代码） | 可以由什么来满足 |
| --- | --- | --- |
| Session | `getSession(session_id) -> (Session, Event[])`；`getEvents(session_id) -> PendingEvent[]`（尚未处理）；`emitEvent(id, event)` | 任何只追加的日志：能从任意事件点按顺序消费，并接受幂等追加。例如 Postgres、SQLite、内存数组等 |
| Orchestration | `wake(session_id) -> void` | 任何调度器：能带着一个 ID 去调用函数，失败就重试。例如 cron 任务、队列消费者、while 循环等 |
| Harness | `yield Effect<T> -> EffectResult<T>` | 任何这样的循环：产出 effect，并把进展追加进 Session |
| Sandbox | `provision({resources})`；`execute(name, input) -> String` | 任何执行器：配置一次，然后作为工具被调用很多次。例如本地进程、远端容器等 |
| Resources | `[{source_ref, mount_path}]` | 任何持久存储：容器可以按引用去取。例如 Filestore、GCS、git remote、S3 |
| Tools | `{name, description, input_schema}` | 任何能写成「一个名字加一种输入形状」的能力。例如 MCP 服务器、自定义工具等 |

#### 安全边界

在耦合在一起的设计里，Claude 生成的任何不受信任代码，都和凭证跑在同一个容器里。一次提示注入只要说服 Claude 去读自己的环境就够了。攻击者拿到这些令牌之后，可以再开一批全新的、不受限制的会话，把工作委托过去。把令牌的权限收窄，是显而易见的缓解。可这又把一条假设编码了进去：Claude 拿着一枚受限令牌做不了什么。而 Claude 正在变得越来越聪明。结构上的修法，是让令牌从 Claude 所生成代码运行的那个沙箱里，根本够不着。

他们用了两种模式来保证这一点。认证可以跟资源绑在一起，也可以放在沙箱外面的凭证库里。对 Git，他们用每个仓库自己的访问令牌，在沙箱初始化时把仓库克隆下来，再接到本地的 git remote 上。沙箱里面可以 `push` 和 `pull`，Agent 自己从头到尾不接触这枚令牌。对自定义工具，他们支持 MCP（Model Context Protocol，模型上下文协议），把 OAuth 令牌存在安全的凭证库里。Claude 经一个专用代理调用 MCP 工具。这个代理收下与该会话关联的一枚令牌，再从凭证库取出对应的凭证，去调用外部服务。harness 始终不会得知任何凭证。

### 会话不是 Claude 的上下文窗口

长时程任务常常超过 Claude 上下文窗口的长度。常见的应对办法，都要对「留下什么」做不可逆的决定。这些手法他们在先前关于[上下文工程](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)的工作里谈过。例如，compaction（上下文压缩）让 Claude 把自己的上下文窗口存成一份摘要；记忆工具让 Claude 把上下文写进文件，从而可以跨会话学习。这可以和上下文裁剪配在一起：有选择地删掉一些 token，比如旧的工具结果或思考块。

有选择地留下或丢掉上下文，这种不可逆决定会带来失败。很难知道未来的回合需要哪些 token。消息若被一次 compaction 改写，harness 会把被压缩的消息从 Claude 的上下文窗口里拿掉；只有事先存下来，它们才找得回来。先前的工作[探讨过](https://arxiv.org/pdf/2512.24601)一种办法：把上下文存成一个活在上下文窗口**外面**的对象。例如，上下文可以是 REPL（交互式解释器）里的一个对象，大语言模型写代码去过滤或切片，从而以编程方式访问它。

![Session 把事件交给 harness，harness 用 getEvents 取回](https://www-cdn.anthropic.com/images/4zrzovbb/website/cf0719d7832b1f577b7393c84a7c53eecc725ca4-760x200.png)

图：Session 把 Events 送给 Harness；Harness 通过 `getEvents` 回头读取。原文未附图注。

在 Managed Agents 里，会话提供同样的好处：它是一个活在 Claude 上下文窗口外面的上下文对象。上下文并不存在沙箱或 REPL 里，而是持久地存在会话日志里。接口 `getEvents()` 让大脑去盘问上下文：按位置切下事件流的一段。用法可以很灵活。大脑可以从上次读到的地方接着读，也可以在某个时刻之前倒回几条事件，看看前因，或者在某个动作之前把上下文再读一遍。

取回来的事件，也可以先在 harness 里做变换，再送进 Claude 的上下文窗口。变换可以是 harness 所编码的任何东西，包括为了提高提示缓存命中率而做的上下文组织，也包括上下文工程。他们把「可恢复的上下文存储」（放在会话里）和「任意的上下文管理」（放在 harness 里）拆开，是因为没法预测未来的模型会需要哪一种具体的上下文工程。接口把上下文管理推进 harness，只保证会话是持久的，并且可以拿来盘问。

### 许多大脑，许多手

#### 许多大脑

把大脑和手拆开，解决了最早的一批客户抱怨之一。团队希望 Claude 对着他们自己 VPC 里的资源干活时，原先唯一的路是把网络和 Anthropic 的网络做对等互联，因为装着 harness 的那个容器假定每一样资源都坐在旁边。harness 一旦不在容器里，这条假设就消失了。

同一次改动还有性能上的回报。最初把大脑放进容器，意味着有多少个大脑就要多少个容器。对每一个大脑，容器配备好之前，推断都没法开始。每一次会话都得先付满容器的启动成本：克隆仓库、把进程拉起来、从服务器上取回待处理事件。即使这次会话根本不会碰到沙箱，也得这么做。

这段空等表现在首 token 时间（time-to-first-token，TTFT）上。TTFT 量的是：一次会话从接下工作，到产出第一个响应 token，中间等了多久。这是用户感觉最明显的那段延迟。

大脑和手拆开之后，容器只在需要时才由大脑通过一次工具调用去配备：`execute(name, input) → string`。一次会话如果眼下不需要容器，就不必等容器。编排层从会话日志里拉出待处理事件，推断就可以开始。用上这套架构之后，他们的 p50 TTFT 大约下降了 60%，p95 下降了 90% 以上。扩展到许多大脑，就是启动许多无状态的 harness，只在需要时才把手接上去。

#### 许多手

他们还想让每一个大脑能连上许多只手。实际意思是：Claude 必须对许多个执行环境做推理，并决定工作送到哪里。这比在一个 shell 里干活更难。一开始把大脑放在单个容器里，是因为更早的模型还做不到这一点。智能提高之后，单个容器反过来成了限制：那个容器一失败，大脑所伸进去的每一只手，状态都丢了。

把大脑和手拆开，每一只手就成了一个工具，`execute(name, input) → string`：进去的是名字和输入，出来的是一个字符串。这个接口托得住任何自定义工具、任何 MCP 服务器，以及他们自己的工具。harness 并不知道沙箱是一个容器、一部手机，还是一个宝可梦模拟器。也因为没有任何一只手绑死在某一个大脑上，大脑之间可以把手递来递去。

![多份 harness 与多份沙箱可以互相连接](https://www-cdn.anthropic.com/images/4zrzovbb/website/4f67b1c10566552aec514a716ea43544ab330e0b-668x243.png)

图：左侧叠着多份 Harness，右侧叠着多份 Sandbox，中间双向相连。原文未附图注。

### 结论

他们面对的挑战是个老问题：怎样为一个「还没被想到的程序」设计系统。操作系统能活过几十年，是因为把硬件虚拟成了足够一般的抽象，装得下当时还不存在的程序。做 Managed Agents 时，目标是设计一个容得下未来的 harness、沙箱，以及 Claude 周围其他部件的系统。

Managed Agents 是同一精神下的 meta-harness（元脚手架）：它对 Claude 将来具体需要哪一种 harness 不持成见。它是一套带有一般接口的系统，容得下许多种不同的 harness。例如 Claude Code 就是一个很好的 harness，他们在各种任务上广泛使用。他们也表明过，针对特定任务的 Agent harness 在窄领域里表现出色。Managed Agents 哪一种都容得下，并随着时间跟上 Claude 的智能。

meta-harness 的设计，意思是对 Claude 周围的接口持有明确看法：他们预期 Claude 需要能操作状态（会话），也需要能做计算（沙箱）。他们也预期 Claude 需要能扩展到许多大脑、许多只手。接口是按这些能力来设计的，好让它们在很长的时间跨度上可靠、安全地运行。至于大脑和手的数量、位置，他们不做假设。

### 致谢

作者为 Lance Martin、Gabe Cemaj 与 Michael Cohen。感谢 N.T.A. 与 Jeremy Fox 在这些题目上的有益讨论。特别感谢 Agents API 团队以及 Jake Eaton 的贡献。

## 笔记

- 接口表里的 Orchestration 只承诺 `wake(session_id)`：带一个 ID 去调用、失败再试。大脑有几个、在哪，不在这张契约里。
- 容器不能靠人登进去救，是因为里面有用户数据。可调试性和「令牌够不着沙箱」是同一条边界，不是两件事后补上的安全措施。
- Sonnet 4.5 上为上下文焦虑加的重置，到 Opus 4.5 成了死重。和[长时运行应用的 Harness 设计](./harness-design-long-running-apps)是同一条线：写进脚手架的「模型做不到」要准备作废。
- `getEvents()` 把上下文工程留在 harness 里，会话只保证持久、可按位置重读。窗口里放什么，仍是[上下文工程](./effective-context-engineering-for-ai-agents)那一篇的问题。

返回 [AI / Agent 阅读清单](./)。
