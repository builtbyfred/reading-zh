---
title: "Claude Code 与 Pi Agent 功能对照"
title_en: "Claude Code vs Pi Agent — Feature Comparison"
description: "社区对照表：Pi v0.52.10 与 2026 年 2 月的 Claude Code，从设计哲学、工具、钩子到企业和分发逐项比较。"
source: "disler/pi-vs-claude-code"
source_url: "https://github.com/disler/pi-vs-claude-code/blob/main/COMPARISON.md"
status: "译文"
tags:
  - "Pi"
  - "Claude Code"
  - "harness"
---

# Claude Code 与 Pi Agent 功能对照

**非官方译文。** 原文：[Claude Code vs Pi Agent — Feature Comparison](https://github.com/disler/pi-vs-claude-code/blob/main/COMPARISON.md)（disler/pi-vs-claude-code）。文首写明对照的是 Pi v0.52.10 与 Claude Code（2026 年 2 月）。正文保留原文的表格，单元格为中文。专名保留。

## 导读

这是一张社区对照表，不是 Mario Zechner 的原文，也不是 Anthropic 的文档。适合已经读过 [Claude Code 最佳实践](./claude-code-best-practices)，想按功能逐行看两边差在哪的人。作者自己的取舍见 [做一个有主见的极简编码 Agent，我学到了什么](./what-i-learned-building-pi-coding-agent)（2025-11-30）。那篇更早：表里的 compaction（上下文压缩）、扩展和权限门，长文里还没有写成已经做完的功能。

和本站 harness（任务脚手架）清单的关系：[长时运行应用的 Harness 设计](./harness-design-long-running-apps) 讲外壳怎么拆阶段、把状态留在模型外面。这张表把同一件事拆成两列。Pi（有主见的极简 coding agent）把复杂度留在用户手里，Claude Code 把复杂度留在 harness 里。上下文工程（context engineering）在表里是单独一行。MCP、Skill、子 Agent 也可以回到 [Model Context Protocol 介绍](./model-context-protocol)、[用 Agent Skills 装备 Agent](./agent-skills)、[用 Claude Agent SDK 构建 Agent](./claude-agent-sdk) 看 Anthropic 这边怎么讲。

「胜出」一列是对照表作者的判断，译文照录，不代表本站站队。很多行是「两者」。没有精确到日的发表日期，本页不写 `date`。

## 译文

对照范围：Pi v0.52.10 与 Claude Code（2026 年 2 月）。

### 设计哲学

| 维度 | Claude Code | Pi | 胜出 |
| --- | --- | --- | --- |
| 核心主张 | 「给每个工程师的工具」：电池已装好，各种水平都能用 | 「我用不上的，就不做」：极简、有主见，为一个工程师的工作流而做 | 两者 |
| 功能取舍 | 能做的都内建（子 Agent、团队、MCP、plan mode、待办、网页搜索、笔记本、10 个以上工具） | 只做最少的（4 个工具，约 200 token 的提示）。其余通过扩展或 bash 按需打开 | 两者 |
| 安全哲学 | 默认安全：先拒绝的权限、5 种模式、文件系统沙箱、用 Haiku 预审命令 | 默认 YOLO mode（默认不拦权限）：没有权限，没有沙箱。原文认为，编码 Agent 里的安全大多是表演；只要它能写代码并运行代码，就没戏了 | 两者 |
| 系统提示的信任模型 | 大量护栏（约 1 万 token）：行为规则、格式说明、安全约束、工具用法示例 | 信任模型（约 200 token）。原文认为前沿模型已经用强化学习训得足够充分，本来就懂 coding agent 是什么 | 两者 |
| 可观察性 | 被抽象掉：子 Agent 是黑盒，compaction 静默发生，系统提示默认用户看不见 | 完全透明：每个 token 看得见，每次工具调用可检查，没有隐藏的编排，会话可导出 HTML | Pi |
| 上下文工程 | 替你管：自动 compaction，溢出交给子 Agent，由系统决定什么进上下文 | 用户自己控制：提示开销极小，没有隐藏注入。原文认为，精确控制进上下文的东西，输出会更好 | Pi |
| 扩展方式 | Shell 钩子（外部进程）加 MCP 协议，再加 Skill（`SKILL.md` 这类按需展开的技能说明）：松耦合，靠配置驱动 | 进程内的 TypeScript 扩展：同一运行时，能访问完整会话状态，可以拦截、修改、变换任何事件 | 两者 |
| 目标用户 | 每个工程师：对新手友好，能进企业，有引导式工作流，渐进披露（progressive disclosure） | 高阶用户：想要控制权、懂取舍、愿意自己搭工作流的工程师 | 两者 |
| 多模型立场 | Claude 优先：为 Claude 家族优化，其他模型走网关这种变通 | 从第一天就与模型无关：324 个模型、20 家以上提供方，以及 context handoff（跨提供方交接上下文）。原文说「我们活在多模型的世界里」 | Pi |
| 做计划的方式 | 内建 plan mode（计划模式）：按探索、计划、写代码分阶段，有只读模式和专用子 Agent | 没有 plan mode。原文的说法是让 Agent 和你一起想。计划写进文件，才能留下、做版本、跨会话复用 | 两者 |
| 复杂度预算 | 复杂度放在 harness 里，你就不用去想它：魔法更多，自己接线更少 | 复杂度放在你手里：harness 极小，加什么、何时加由你决定。原文认为，三行相似的代码也好过一层过早的抽象 | 两者 |

### 成本与许可

| 功能 | Claude Code | Pi | 胜出 |
| --- | --- | --- | --- |
| 工具许可 | 专有 | MIT（开源，可以 fork、嵌入、自托管） | Pi |
| 订阅成本 | 每月 20 到 200 美元，或专用的 Anthropic API 密钥 | 0 美元（MIT，自带 API 密钥） | Pi |
| 费用跟踪 | 可用 `/cost`，也可通过状态栏配置来改 | 页脚按会话实时显示金额、token 和缓存，也可通过扩展来改 | 两者 |
| 费用优化 | 同一家提供方的三档价格：Opus 高于 Sonnet，Sonnet 高于 Haiku | 按任务混用便宜和贵的模型，提供方不限，也有免费档 | Pi |
| 系统提示开销 | 约 10000 token 以上 | 约 200 token（剩下的上下文留给真正的工作） | Pi |

### 模型与提供方

| 功能 | Claude Code | Pi | 胜出 |
| --- | --- | --- | --- |
| 官方提供方 | 4 个平台（Anthropic API、AWS Bedrock、Google Vertex、Foundry），提供的都是 Claude 模型 | 20 家以上原生支持（Anthropic、OpenAI、Google、Groq、xAI、OpenRouter、Azure、Bedrock、Vertex、Mistral、MiniMax、Kimi、Cerebras、ZAI、HuggingFace，以及自定义） | Pi |
| 非 Anthropic / 自托管模型 | 通过 `ANTHROPIC_BASE_URL` 网关，转到任何 OpenAI 兼容后端（OpenRouter、LiteLLM、本地 TGI、vLLM）。能用，但是非官方变通 | 所有提供方和本地模型都是一等支持（Ollama、vLLM、LM Studio，经 `models.json`）。不需要代理 | Pi |
| 内建模型 | 约 6 个别名（`opus`、`sonnet`、`haiku`、`opusplan`、`sonnet[1m]`、`default`），映射到 Claude 家族 | 324 个（经 ModelRegistry 确认），覆盖所有提供方 | Pi |
| 会话中途换模型 | 可以：`/model` 加别名或名称，启动时用 `--model`，或环境变量 `ANTHROPIC_MODEL` | 可以：Ctrl+P 循环，Ctrl+L 模糊选择，SDK 里用 `session.setModel()` | 持平 |
| OAuth / 订阅登录 | Anthropic 订阅（Pro、Max、Teams、Enterprise） | Claude Pro、ChatGPT Plus、GitHub Copilot、Gemini CLI、Antigravity，都走 `/login` 和 API 密钥 | Pi |
| 思考 / 力度档位 | Opus 4.6 上 3 档（low / medium / high），用 `/model` 滑杆、环境变量或设置 | 所有支持思考的模型统一 5 档（off / minimal / low / medium / high），Shift+Tab 循环 | Pi |

### Agent harness

| 功能 | Claude Code | Pi | 胜出 |
| --- | --- | --- | --- |
| 源代码 | 闭源（专有） | 开源（MIT） | Pi |
| 系统提示大小 | 约 10000 token 以上（大量工具描述、行为规则、安全护栏） | 约 200 token（极简，信任前沿模型不用手把手也能写代码） | Pi |
| 默认工具 | 10 个以上（Read、Write、Edit、Bash、Glob、Grep、WebSearch、WebFetch、NotebookEdit、Task） | 4 个（read、write、edit、bash），另加 3 个可选（grep、find、ls） | 两者 |
| Agent 架构 | 单体仓库里的 TypeScript CLI：一个包包含内建工具执行、子 Agent 和团队协调 | 四个包的单体仓库（pi-ai、pi-agent-core、pi-tui、pi-coding-agent），把 LLM 抽象、Agent 循环、TUI（终端用户界面）和 CLI 分开 | 两者 |
| 子 Agent | 原生 Task 工具：7 个并行子 Agent，权限继承，分类型角色（Explore、Plan、Bash、general-purpose） | 没有内建。扩展可以拉起单独的 Pi 进程，模式有单次、并行、链式，每个子 Agent 可以用不同模型 | Claude Code |
| Agent 团队 | 原生团队协调（领队加工作者，共享任务列表，传消息，广播） | 没有内建。可以用 SDK 编排脚本，或用 RPC 模式驱动多个 Pi 进程 | Claude Code |
| 默认权限模型 | 5 种模式（default、plan、acceptEdits、bypassPermissions、dontAsk）：先拒绝，带文件系统和网络沙箱 | 默认没有（YOLO mode）：什么都跑，不问。权限门扩展可以装，但是选装 | Claude Code |
| 记忆文件 | `CLAUDE.md`（项目根、嵌套目录、用户级）：自动加载，分层 | `AGENTS.md`：约定类似，并与 `~/.claude/skills` 这套跨工具标准兼容 | 持平 |
| 费用可见性 | 用 `/cost`，也可通过状态栏配置来改 | 默认就在页脚里，还可通过扩展和 `getSessionStats()` 再改 | 持平 |
| 钩子系统 | Shell 命令钩子（PreToolUse、PostToolUse、Stop、Notification）：外部脚本，通过或失败 | TypeScript 扩展事件（20 种以上）：进程内异步处理函数，可以拦截、修改、变换，能访问会话状态，也能渲染界面 | Pi |
| 会话格式 | 线性对话 | 带 id / parentId 的 JSONL 树（分支、fork，用 `/tree` 和 `/fork` 打标签） | Pi |
| 扩展状态 | 扩展没有内建的状态持久化 | `pi.appendEntry()` 把自定义数据写入会话，重启还在 | Pi |

### 工具与能力

#### 内建工具（逐项）

| 工具 | Claude Code | Pi | 胜出 |
| --- | --- | --- | --- |
| Read | 内建：读文件，可选偏移和长度，支持图像、PDF、笔记本 | 内建（`read`）：读文件，可选范围，图像自动缩放 | 持平 |
| Write | 内建：创建或覆盖文件 | 内建（`write`）：创建或覆盖文件 | 持平 |
| Edit | 内建：精确字符串替换，可选全部替换 | 内建（`edit`）：精确查找替换，返回统一 diff | 持平 |
| Bash | 内建：执行 shell，带超时、后台模式和描述 | 内建（`bash`）：执行 shell，输出可流式，可中止 | 持平 |
| Glob | 内建：按模式快速找文件，按修改时间排序 | 不内建。可选的 `find` 通过 `--tools` 打开 | Claude Code |
| Grep | 内建：由 ripgrep 驱动，支持正则、上下文行和多种输出模式 | 默认不内建。可选的 `grep` 通过 `--tools` 打开 | 持平 |
| WebSearch | 内建：网页搜索，可按域名过滤，返回排好版的结果 | 不内建，可用扩展自定义 | Claude Code |
| WebFetch | 内建：抓取 URL，把 HTML 转成 Markdown，再做 AI 处理 | 不内建，可用扩展自定义 | Claude Code |
| NotebookEdit | 内建：编辑 Jupyter 笔记本单元格（替换、插入、删除） | 不内建，可用扩展自定义 | Claude Code |
| Task（子 Agent） | 内建：拉起分类型的子 Agent（Explore、Plan、Bash、general-purpose），可并行 | 不内建，可用扩展自定义。子 Agent 扩展会拉起单独的 Pi 进程 | Claude Code |
| ls | 不是专用工具（用 Bash 或 Glob） | 可选内建（`ls`），通过 `--tools` 打开 | 持平 |

#### 工具系统的能力

| 功能 | Claude Code | Pi | 胜出 |
| --- | --- | --- | --- |
| 工具可观察性 | 子 Agent 的工具调用是不透明的 | 每次工具调用、每个 token、每一美元都看得见 | Pi |
| 自定义工具 | 通过 MCP 服务器（外部进程，JSON-RPC） | `pi.registerTool()`，进程内 TypeScript，结果可流式，渲染可自定义 | Pi |
| 覆盖内建工具 | 做不到 | 用同名再注册，即可替换内建工具（例如带审计的 read） | Pi |
| MCP 支持 | 原生一等支持，懒加载（上下文减少 95%），支持 OAuth | 不内建（有意如此；对照表称工具描述要占 7k 到 14k token）。可通过扩展使用 | Claude Code |
| 工具数量的哲学 | 工具越多，开箱能力越强（10 个以上） | 工具越少，系统提示越小（约 1000 token），信任前沿模型 | 两者 |

### 钩子与事件系统

Claude Code：**14 个钩子事件**，3 种处理类型（command、prompt、agent）。基于 shell，JSON 走标准输入和标准输出。

Pi：**25 个扩展事件**，分 7 类。进程内 TypeScript，能访问完整 API。

#### 架构

| 功能 | Claude Code | Pi | 胜出 |
| --- | --- | --- | --- |
| 钩子语言 | Shell 命令（任何语言）、LLM 提示，或 Agent 子进程 | TypeScript（进程内，经 jiti 免构建直接跑） | Pi |
| 处理类型 | 3 种：command（shell）、prompt（让 LLM 判断）、agent（多轮子 Agent） | 1 种：异步 TypeScript 处理函数，能访问完整会话和界面 | 两者 |
| 钩子配置放在哪 | 设置文件里的 JSON（`.claude/settings.json`、托管策略、插件的 `hooks.json`、skill 或 agent 的 frontmatter） | 扩展文件里的 TypeScript 代码 | 两者 |
| 能否修改工具输入 | 可以：`PreToolUse` / `PermissionRequest` 里的 `updatedInput` | 可以：从 `tool_call` 处理函数返回改过的参数 | 持平 |
| 异步 / 后台钩子 | 可以：命令钩子设 `async: true`（不阻塞，结果下一轮送达） | 可以：处理函数默认就是异步，也可以发出去不管结果 | 持平 |
| 钩子之间通信 | 没有内建 | 有：`pi.events`，扩展之间共享事件总线 | Pi |

#### 逐项对应

| 时机 | Claude Code 钩子 | Pi 扩展事件 | 说明 |
| --- | --- | --- | --- |
| 会话开始 | `SessionStart`（匹配 startup / resume / clear / compact） | `session_start` | Claude Code 可通过 `CLAUDE_ENV_FILE` 把环境变量留下来。两边都能注入上下文 |
| 用户提交提示 | `UserPromptSubmit`：可拦截提示、追加上下文 | `input`：可拦截、改写文本，或完全自己处理 | Pi 还区分来源：interactive / rpc / extension |
| 工具执行前 | `PreToolUse`：允许、拒绝或询问，可改输入 | `tool_call`：可带理由拦截，可改参数，按工具收窄类型 | 两边都能拦截和修改。Pi 用 `isToolCallEventType` 做类型收窄 |
| 弹出权限对话框 | `PermissionRequest`：可代替用户自动允许或拒绝 | 不适用（Pi 默认没有权限系统） | 仅 Claude Code。Pi 默认是 YOLO mode，权限门是扩展 |
| 工具成功之后 | `PostToolUse`：给 Claude 反馈，可改 MCP 输出 | `tool_result`：可改结果、记日志、变换输出 | 大体相当 |
| 工具失败之后 | `PostToolUseFailure`：把失败的上下文补进去 | `tool_result`（`isError` 标志） | Claude Code 有专门事件。Pi 用同一事件加上错误标志 |
| 工具执行的流式过程 | 不适用 | `tool_execution_start`、`tool_execution_update`、`tool_execution_end` | 仅 Pi：实时看到工具执行的进度 |
| 拦截 bash 的启动 | 不适用 | BashSpawnHook：bash 执行前可改命令、工作目录、环境变量 | 仅 Pi：拦在进程被拉起的那一层 |
| 用户直接跑 bash | 不适用 | `user_bash`：用户用 `!!` 前缀输入 shell 命令时触发 | 仅 Pi |
| 发出通知 | `Notification`（匹配 permission_prompt / idle_prompt / auth_success / elicitation_dialog） | 不适用（在任意处理函数里用 `ctx.ui.notify`） | 作为钩子事件，仅 Claude Code 有 |
| 子 Agent 启动 | `SubagentStart`（按 Agent 类型匹配） | 不适用（Pi 没有内建子 Agent） | 仅 Claude Code |
| 子 Agent 结束 | `SubagentStop`：可以阻止子 Agent 停下来 | 不适用 | 仅 Claude Code |
| Agent 停止回复 | `Stop`：可以强迫 Claude 继续 | 不适用（用 `turn_end` 或 `agent_end` 来反应） | Claude Code 可以拦住「停止」。Pi 不能拦，但可以把后续消息排队 |
| 队友变为空闲 | `TeammateIdle`：可以强迫队友继续 | 不适用（Pi 没有内建团队） | 仅 Claude Code |
| 任务标为完成 | `TaskCompleted`：可以拦住完成 | 不适用（Pi 没有内建任务系统） | 仅 Claude Code |
| compaction 之前 | `PreCompact`（匹配 manual / auto） | `session_before_compact`：可以整个换掉 compaction 的做法 | Pi 可以完全替换 compaction 的逻辑 |
| compaction 之后 | 不适用 | `session_compact` | 仅 Pi |
| 会话分支之前 | 不适用 | `session_before_fork`、`session_before_switch`、`session_before_tree` | 仅 Pi：会话是一棵树 |
| 会话分支之后 | 不适用 | `session_fork`、`session_switch`、`session_tree` | 仅 Pi |
| 会话结束 | `SessionEnd`（匹配 clear / logout / exit / other）：不能做决定 | `session_shutdown` | 退出时两边都会触发。都不能拦住退出 |
| Agent 处理提示之前 | 不适用 | `before_agent_start`：可改系统提示、图像和提示文本 | 仅 Pi：每一轮的系统提示可以变 |
| Agent 回合的生命周期 | 不适用 | `agent_start`、`agent_end`、`turn_start`、`turn_end` | 仅 Pi：生命周期更细 |
| 消息流式输出 | 不适用 | `message_start`、`message_update`、`message_end` | 仅 Pi：可以按 token 碰到流式输出 |
| 模型被换掉 | 不适用 | `model_select`（来源：set / cycle / restore） | 仅 Pi：可以对换模型做出反应 |
| 访问上下文窗口 | 不适用 | `context`：消息的深拷贝，可以过滤或裁剪 | 仅 Pi：可以直接改上下文 |

### 扩展与定制

| 功能 | Claude Code | Pi | 胜出 |
| --- | --- | --- | --- |
| 扩展语言 | Shell 脚本（钩子）、Markdown（命令） | TypeScript（经 jiti 免构建） | Pi |
| 斜杠命令 | `.claude/commands/*.md` 提示模板 | 提示模板，加上 `/skill:name`，以及扩展注册的命令 | 持平 |
| 包怎么发出去 | 插件市场：`/plugin` 命令，基于 git 分享 | `pi install` 支持 npm、git、本地路径；`pi config` 的 TUI；npm 上的展廊 | 两者 |
| Skill（Agent Skills 标准） | 有（可自动调用） | 有（渐进披露，与 `~/.claude/skills` 跨工具兼容） | 持平 |
| 主题 | 只能少量自定义 | 51 个颜色 token，热重载，内建暗色和亮色，社区主题走包 | Pi |
| 自定义快捷键 | `~/.claude/keybindings.json` | 扩展里 `pi.registerShortcut()` | 持平 |
| 自定义 CLI 参数 | 做不到 | `pi.registerFlag()` 给 CLI 加参数 | Pi |
| 自定义提供方 | 做不到 | `pi.registerProvider()`，支持 OAuth | Pi |
| 自定义编辑器 | 做不到 | 扩展可提供模态编辑器（vim）、emacs 键位、彩虹编辑器 | Pi |

### 界面与终端

| 功能 | Claude Code | Pi | 胜出 |
| --- | --- | --- | --- |
| 自定义页眉 | 没有 | `ctx.ui.setHeader()` 用自定义组件替换标志和快捷键提示 | Pi |
| 自定义页脚 | 可配置的状态栏（token、费用、模型） | `ctx.ui.setFooter()`：git 分支、token 统计、费用，或任何内容 | Pi |
| 状态栏 | 可配置的状态栏（token、费用、模型） | `ctx.ui.setStatus()`：主题色、回合跟踪、自定义数据 | Pi |
| 小组件 | 没有 | `ctx.ui.setWidget()` 放在编辑器上方或下方，内容自定义 | Pi |
| 覆盖层 | 没有 | 完整的覆盖层应用（Doom、Space Invaders，以及问答测试用的覆盖层） | Pi |
| 对话框 | 基本的权限提示 | `ctx.ui` 的 select、confirm、input、editor，外加自定义渲染 | Pi |
| 渲染 | 标准终端，有已知问题 | 标准终端，有已知问题 | 两者 |
| 消息排队 | 支持：Agent 干活时把消息排进队列 | Enter 是 steer（打断当前回合），Alt+Enter 是后续消息（做完再排上） | 两者 |

### 编程接口与 SDK

| 功能 | Claude Code | Pi | 胜出 |
| --- | --- | --- | --- |
| 非交互模式 | `claude --print` | `pi -p`（从标准输入来的内容会自动进入这个模式） | 持平 |
| JSON 流 | `--output-format stream-json` | `--mode json`（JSONL 事件，带完整生命周期） | 持平 |
| RPC 模式 | 没有 | `--mode rpc`（26 个以上命令，双向 JSON 协议，语言不限） | Pi |
| Node.js SDK | `@anthropic-ai/claude-agent-sdk` | `@mariozechner/pi-coding-agent`（`createAgentSession`，完整内部 API） | 持平 |
| 流进行到一半时的控制 | `ClaudeSDKClient.interrupt()`：停下并改方向 | `steer()` 打断，`followUp()` 在 Agent 干活时把消息排队 | Pi |
| 会话统计 API | 有限 | `getSessionStats()` 返回本次会话的 token（输入、输出、缓存）、费用和工具调用 | Pi |
| 导出 HTML | `/export`：把会话导出成 HTML | `--export`、`/export`、`session.exportToHtml()` | 两者 |
| SDK 示例 | 以文档为主 | 包里有 12 个官方示例，从最小到完全控制 | Pi |

### 多 Agent 与编排

| 功能 | Claude Code | Pi | 胜出 |
| --- | --- | --- | --- |
| 子 Agent | 原生 Task 工具，7 路并行，权限继承 | 子 Agent 扩展（单次、并行、链式），拉起单独的 Pi 进程 | Claude Code |
| Agent 团队 | 原生团队协调（领队加工作者） | 没有对等的内建功能，用编排脚本 | Claude Code |
| 多模型编排 | 做不到（单一提供方） | 每个子 Agent 可以用不同模型（侦察用 flash，干活用 opus） | Pi |

### 企业与平台

| 功能 | Claude Code | Pi | 胜出 |
| --- | --- | --- | --- |
| IDE 集成 | VS Code、JetBrains、Cursor（行内 diff、`@` 提及） | 只有终端（也可以通过 RPC 去做集成） | Claude Code |
| Web / 移动端 / 桌面 | claude.ai/code、iOS 应用、桌面应用 | 只有终端 | Claude Code |
| 企业 SSO / 审计 | 有（SSO、MFA、审计日志、管理后台） | 没有 | Claude Code |
| 权限 / 沙箱 | 5 种模式，先拒绝的规则，文件系统和网络沙箱 | 默认没有（YOLO mode）；有权限门扩展 | Claude Code |
| Git 集成 | 深：提交、PR、合并冲突、GitHub Actions、GitLab CI | 通过 bash；另有 git-checkpoint 扩展 | Claude Code |
| Slack / 聊天集成 | 原生：`@Claude` 提及可以开 PR | pi-mom 这个 Slack 机器人包 | Claude Code |

### 分享与分发

| 功能 | Claude Code | Pi | 胜出 |
| --- | --- | --- | --- |
| 包系统 | 插件市场：`/plugin` 命令，清单文件是 `.claude-plugin/plugin.json` | `pi install` 接受 `npm:`、`git:`、本地路径。`package.json` 里有 `pi` 字段，npm 关键词是 `pi-package` | 两者 |
| 包里装什么 | Skill、Agent、钩子、MCP 服务器、LSP 服务器 | 扩展、Skill、提示模板、主题 | 两者 |
| 从哪分发 | 市场（GitHub 仓库、git URL、npm、pip、直接 URL、本地路径） | npm 注册表、git（GitHub、GitLab、SSH）、本地路径。不需要中间再套一层市场 | 两者 |
| 怎么被找到 | 官方 `claude-plugins-official` 市场，加上通过 `extraKnownMarketplaces` 配的团队或社区市场 | npm 按关键词 `pi-package` 搜索，加上 [shittycodingagent.ai/packages](https://shittycodingagent.ai/packages) 展廊，带视频和图片预览 | 两者 |
| 作用范围 | 用户、项目、本地、托管（企业）。命名空间写成 `plugin-name:skill-name` | 全局（`~/.pi/`）或项目（`.pi/`，`-l` 参数）。项目设置会在启动时自动装上缺的包 | 持平 |
| 配置界面 | `/plugin` 斜杠命令，用来安装、浏览、管理 | `pi config`：交互式 TUI，按资源启用或停用 | 持平 |
| 不安装就试 | 没有对等功能 | `pi -e npm:@foo/bar`：只为当前会话做一次临时安装 | Pi |
| 跨工具能不能带走 | Agent Skills 标准（agentskills.io），与 VS Code、Codex、Cursor、GitHub 共用 | 没有跨工具标准。扩展是 Pi 专用的 | Claude Code |
| 企业控制 | `strictKnownMarketplaces`，按仓库、URL、主机正则做白名单，以及托管式的插件部署 | 没有企业控制：基于信任，安装前自己看源码 | Claude Code |
| 用 git 分享 | 把 `.claude/`（设置、Skill、Agent、规则、钩子）提交进仓库，克隆之后团队就有这套配置 | `.pi/settings.json` 里写着包，启动时给团队自动装上 | 持平 |
| 怎么更新 | 市场在启动时自动更新（可配置） | `pi update` 更新没有钉死版本的包；用 `@version` 钉版本 | 持平 |
| 包的过滤 | 插件资源按原样加载（用命名空间避免撞名） | 按资源类型用 glob，以及用 `!` 排除；也可以强制包含或排除精确路径 | Pi |

### 社区与生态

这一节原文没有「胜出」列。数字是对照表成文时的说法。

| 方面 | Claude Code | Pi |
| --- | --- | --- |
| 谁做的 | Anthropic：年经常性收入超过 10 亿美元的企业 AI 公司（原文写 $1B+ ARR） | Mario Zechner：libGDX 的作者（24.8k star），单独维护 |
| 势头 | 企业在用，IDE 集成深，用户基数大 | 11.5k star，每月 npm 下载 317 万（原文写 3.17M），208 个版本 |
| 谁在背书 | 企业客户，以及 Anthropic 自己的生态 | Armin Ronacher（Flask / Ruff）在用，也在贡献；这套东西支撑着 OpenClaw（145k star） |
| 发布节奏 | 常规发布 | 8 天里 10 次以上发布；新模型可以在几小时内加上支持 |

## 笔记

- 读这张表要带着日期。长文是 2025-11-30，作者还把 compaction 写在愿望清单上。这张表是 Pi v0.52.10、2026 年 2 月，`session_before_compact` 已经可以整段换掉压缩逻辑。功能以表头的版本为准，不要和长文逐句对死。
- token 数字也有两套口径。长文说系统提示加工具定义合计低于 1000 token。这张表把系统提示单独写成约 200 token，工具哲学那一行又写约 1000 token。都是各自原文里的数字。
- MCP 那一行写 Claude Code 已能懒加载、上下文减少 95%。长文批评的是「每次会话把全部工具描述倒进来」。两篇说的不是同一个时间点上的 Claude Code。协议本身见 [Model Context Protocol 介绍](./model-context-protocol)。
- 「胜出」里有很多「两者」。Claude Code 占上风的，多半是开箱能力、子 Agent、团队、权限沙箱、IDE 和企业控制。Pi 占上风的，多半是可观察性、多模型、提示开销、进程内扩展和许可。最后一列代替不了单元格。
- 渲染那一行两边都写「标准终端，有已知问题」。长文用一整节讲 differential rendering（差分渲染）和闪烁，这张表没有展开。tmux 也不在表里，长文用它代替后台 bash。
- 和 [构建高效的 AI Agent](./building-effective-agents)：表的第一行就是「复杂度放在哪」。工作流能写死就写死，只有路径写不死才把决定权交给模型。这张表假设两边都已经是 Agent，比的是外壳。
- 和 [AI Agent 的有效上下文工程](./effective-context-engineering-for-ai-agents)：上下文工程一行是这张表的轴。一边自动压缩、用子 Agent 接住溢出；一边让用户决定什么进上下文。
- 和 [用 Claude Agent SDK 构建 Agent](./claude-agent-sdk)：编程接口一节里，Claude Code 对应 `@anthropic-ai/claude-agent-sdk`，Pi 对应 `@mariozechner/pi-coding-agent`。子 Agent 和团队在 Claude Code 是原生的，在 Pi 是扩展或脚本。
- 社区数字（star、下载量、收入）会过时。本页不改写原文给出的数字，只标明它们属于这张表。
- 产品页、演讲、仓库和二次摘要不单建页，链在作者长文的[笔记](./what-i-learned-building-pi-coding-agent#notes)里：[pi.dev](https://pi.dev/)、[badlogic/pi-mono](https://github.com/badlogic/pi-mono)、[演讲](https://www.youtube.com/watch?v=Dli5slNaJu0)、[ZenML 上的二次摘要](https://www.zenml.io/llmops-database/building-pi-a-minimal-extensible-coding-agent-framework)。

返回 [AI / Agent 阅读清单](./)。
