---
title: "Claude Code 最佳实践"
title_en: "Claude Code best practices"
description: "默认已经够用时别加配置；只有模型看不见的知识、必须通过的检查和不能有例外的规则，才值得写下来。"
source: "Anthropic"
source_url: "https://www.anthropic.com/engineering/claude-code-best-practices"
status: "译文"
tags:
  - "Claude Code"
---

# Claude Code 最佳实践

**非官方译文。** 官方原文：[Claude Code best practices](https://www.anthropic.com/engineering/claude-code-best-practices)（Anthropic · Engineering）。

## 导读

抓取时，这条工程 URL 呈现的是现行文档《Best practices for Claude Code》，而不是早期那篇较短的博客。译文按现场页面逐节翻译。页面没有给出可核对的发表日期，因此不填 `date`。

核心判断是：大多数时候第一条朴素提示就够。只有仓库里模型读代码读不出来的知识、必须能跑通的检查、以及不能有例外的规则，才值得你动手配置。适合已经在用 Claude Code、又在往 `CLAUDE.md` 里越堆越长的人。

团队级设置在另一页：Set up Claude Code for your organization。见[原文](https://www.anthropic.com/engineering/claude-code-best-practices)。

## 译文

Claude Code 的构建方式是：多数情况下，在一个新会话里的第一条朴素提示就已经做对了，不需要你先做任何设置。

例如：

- 为了让命令能安全运行而不必你逐条批准，新的终端和 VS Code 会话以 auto 模式开始，分类器会在任何有风险的东西运行前先审一遍。
- 为了让主对话保持聚焦，同时独立的工作并行发生，Claude 把活分给子 Agent，只在必须时才回来汇报。
- 为了让长会话自己继续、不必你来管，对话会在上下文窗口填满之前自动做 compaction（上下文压缩）。

这一页讲默认不够用时该做什么。通常发生在项目有 Claude 单从代码里看不见的知识、规则或约束时：

- 部署流程只活在某个人脑子里
- 有一个文件绝不能被读
- 有一项检查必须通过，事情才算做完
- 有一笔预算必须守住

没有默认能知道你项目里的这些事，所以这里少量设置是划算的。

会话没按你预期走时，几乎总是下面之一：

- Claude 做出的东西和你想的不一样，或者它每个会话开头都得重新发现同一个事实。它缺的是读仓库读不出来的信息。见「告诉 Claude 它看不见的东西」。
- Claude 说做完了，其实还差一点，通常因为它没有办法检查自己的工作。见「给 Claude 一个能跑的检查」。
- Claude 做了在这个仓库里绝不能发生的事，或跳过了必须总是发生的一步。单靠提示无法保证这两件事。见「强制执行不能有例外的规则」。
- Claude 做对了，但花的时间、token 或权限提示超过了任务的价值。见「改一个默认」。

「让 Claude 在你不在时跑」把同样四点用到无人值守的运行上。「你可以停掉的做法」列出当前模型已经让它变得不必要的建议。

### 确定指令与非确定指令

你给 Claude Code 的每条指令都属于其中一种：

1. 非确定：你写下指令，Claude（模型）读它。这可以是你的提示、`CLAUDE.md` 或一个 Skill。模型然后决定拿这些信息做什么。它通常会遵守，当前模型也善于在没有很多上下文时理解你的意图，但没有保证它会遵守。它仍可以决定不做某些事，或做别的事。
2. 确定：你配置指令，Claude Code（harness，任务脚手架）必须执行它。这可以是一个 hook、一条拒绝规则，或一项托管设置。无论模型决定做什么，Claude Code 每次都会应用它。

Claude Code 里的大多数事情两种形式都有：

| | 非确定（Claude 决定） | 确定（Claude Code 强制） |
| --- | --- | --- |
| 做什么 | 你的提示、`CLAUDE.md`、Claude 自己拾起的 Skill | Hook，以及只有你能启动的 Skill |
| 能碰什么 | Auto 模式的分类器 | 拒绝规则、严格模式下的沙箱、托管设置 |
| 何时算做完 | 要求证据、`/goal`、`/code-review` | 测试、类型检查、`Stop` hook、CI |
| 花多少 | 努力等级、Claude 自己的节奏 | 与 `-p` 一起用的 `--max-turns` 或 `--max-budget-usd`，以及你设的花费上限 |
| 谁说了算 | Claude 对所做之事的总结 | 分支保护、批准合并的人 |

多数时候，你希望 Claude 来决定。几乎每条指南都有例外，当前模型善于阅读眼前的代码，判断一条指南是否适合这个情境。代码就在眼前时，Claude 通常比你事先写的规则更适合做这个判断。

确定的那一种，是你想确保某些事总是发生（或永不发生），无论模型怎么决定。这不必是戏剧性的事。Auto 模式已经挡住戏剧性的事，例如生产部署，或 force push 覆盖别人的工作。通常是你项目特有的，而且可以非常窄：

- 永不编辑 `src/gen/` 里生成的客户端
- 创建文件之后总是跑许可证头脚本

这两条你本来都可以写成 `CLAUDE.md` 或提示里的一行，Claude 几乎每次都会遵守。但无论你措辞多强，某一轮它是否遵守那一行，仍然是 Claude 的决定。

如果一条 `CLAUDE.md` 你不断加强调，Claude 仍然漏掉，那就是这条该进 hook 的信号。反过来也成立：如果 hook 管的只是偏好，删掉它们，让 Claude 决定。

### 告诉 Claude 它看不见的东西

只写下 Claude 读仓库找不到的东西，或它否则每个会话都要花时间重新发现的东西。

Claude 每个任务都从读你的代码开始，当前模型非常擅长这个。它们会找到文件布局、约定、测试框架，以及现有组件是怎么建的，通常比你解释得更快。这意味着你可能想写下来的大部分，Claude 已经知道。

它找不到的，是从未在仓库里的信息：

- 团队在一次会议上做的决定
- 只活在一个人脑子里的部署流程
- 集成测试需要的环境变量

也有信息在仓库里，但要挖几分钟才找得到，而 Claude 每个会话开头都得重挖一遍。

写下来之前的一个好测试：

1. 它读代码能找到吗？
2. 它真的会去看吗？

如果两个都是，就别写。

#### 写一条具体的提示

具体的提示有帮助，是出于同一个原因：它给 Claude 它还没有的信息。如果你点名文件、描述症状，并事先说清「修好」是什么样，通常能省掉后面一轮修正。

两种都合理的做法之间的偏好也一样：Claude 从代码里读不出来。如果你在意它选哪一个，事先说。

| 与其 | 试着 |
| --- | --- |
| 「修登录 bug」 | 「用户报告会话超时后登录失败。看 `src/auth/` 里的 token 刷新，写一个能复现的失败测试，然后修好它」 |
| 「加一个日历组件」 | 「按 `HotDogWidget.php` 的模式做一个日历组件，能选月份并在年份之间翻页。不要新库」 |

如果你已经有 Claude 需要的东西，交出去，而不是描述它：

- 文件：输入 `@` 和路径，把文件内容放进消息。
- 图像：把设计或错误的截图贴进提示。
- 命令输出：从 shell 用管道送进去，例如 `cat error.log \| claude -p "这里发生了什么"`。

`think step by step` 或 `be thorough` 这类短语是普通提示文本，不是关键字。控制 Claude 想多用力的主要旋钮是努力等级，见「改模型和努力」。这种措辞仍可以在其努力设置之内轻轻推 Claude 一把，但不会把它抬过这个设置。

仍有帮助的一句是 `be ambitious`。Claude 倾向于保守地读请求，做出满足它的最小东西，因为它看不见你希望有多大。当你要更完整的版本，边界情况处理好、自然的后续也包括进去，就说出来：

```text
按设计稿做设置页。be ambitious：空状态和错误状态、接好的保存流程、键盘导航，不只是布局
```

这是在告诉 Claude 范围，只有你知道范围，而不是在告诉它要多用力地想。

当你在探索、而不是修某个具体东西时，像 `what would you improve in this file?` 这样含糊的提示完全可以。你会在过程中多纠正一点，这就是取舍。

#### 先和 Claude 一起把问题想清楚

还不完全知道要什么时，不必在提示之前全部想完。让 Claude 反过来采访你：

```text
我想给公开 API 加限流，但还没想透。采访我，直到你能写出规格，然后写到 SPEC.md。
```

Claude 会带回选择题，问你还没钉死的部分：按用户还是按密钥限流、超限的请求怎么办、什么不在范围内。它会一直问，直到答案加起来成为一份规格。

一旦有了 `SPEC.md`，开一个新会话从它来构建，这样构建从一个干净的上下文和写下来的「完成」定义开始。这也是你稍后在「给 Claude 一个能跑的检查」里指给审查者的文件。

#### 让 CLAUDE.md 保持短

Claude Code 把 `CLAUDE.md` 载入每个会话，意味着其中每一行都在每个任务上占一点 Claude 的注意力，无论相不相关。因此这个文件最好只放 Claude 无法从代码本身推出来的东西：

- 在这个仓库里如何确认工作：确切的测试、类型检查和 lint 命令，以及如何跑单个测试文件
- 代码会误导人的地方：到处都是但新代码绝不能抄的旧模式，或看起来没用其实不是的目录
- 不在仓库里的决定：团队选定了哪个错误辅助函数、部署怎么走、什么需要迁移审查
- 任何你已经纠正过两次的事

能通过这个测试的 `CLAUDE.md` 会保持短：

```markdown
# 命令
- 安装：pnpm install
- 跑一个测试文件：pnpm vitest run path/to/file.test.ts
- 类型检查：pnpm tsc --noEmit

# 约定
- 用 src/lib/errors.ts 里的错误辅助函数，不要抛原始字符串
- src/legacy/ 仍在使用，但不要把它的模式抄进新代码

# 易错点
- 集成测试需要设置 DATABASE_URL，见 .env.example
```

在会话里跑 `/context`，确认 Claude 载入了这个文件。

注意类型检查那一行只是命令。Claude 需要知道命令，才能边做边检查自己的工作。如果你还想让 Claude Code 在 Claude 结束前强制类型检查通过，那是 `Stop` hook 的工作。这个文件里写「结束前总是做类型检查」多数时候有效，不是每一次。

不必从零写这个文件：

- `/init` 从代码库生成一个起始版本。之后的工作主要是删行。记忆指南建议保持在 200 行以内。
- `/doctor` 对 Claude 已经能从代码推出来的内容建议删减。
- `/doctor prompt-audit` 标出为更老的模型写的指令、指向已不存在的文件、或互相矛盾的指令。

个人偏好放在 `CLAUDE.local.md`，而不是 `CLAUDE.md`，并把该文件加进 `.gitignore`，让它留在仓库之外。

如果 Claude 一直忽略 `CLAUDE.md` 里的一行，加 IMPORTANT 大概修不好。要么文件已经长到这一行被淹没，要么这一行是不能有例外的规则，那种情况它属于 hook。

#### 把规则限定到代码库的一部分

如果一条规则只在代码库的一部分重要，把它放进 `.claude/rules/`，用 `paths:` 过滤，这样只在 Claude 真的在那里工作时才加载。例如这个 `.claude/rules/api.md` 会为 `src/api/` 下的 TypeScript 文件加载：

```markdown
---
paths:
  - "src/api/**/*.ts"
---
- 用 src/api/schemas/ 里的 zod schema 校验请求体，不要手写检查
- 每个新端点都要在 openapi.yaml 里有一条，否则 CI 失败
```

#### 把团队流程放进 Skill

更强的模型更懂工程，但不懂你们团队怎么发版、事故手册怎么说、或你希望 API 文档怎么写。这类知识放进 Skill：保存在 `.claude/skills/<name>/SKILL.md` 的一份流程或一块团队知识。

对这类内容，Skill 在上下文上也比 `CLAUDE.md` 更轻。Claude 可以自己启动的 Skill，每个会话都能看到名称和描述，但只在任务需要时才读完整文件。一份很长的发版流程放在 Skill 里，不会像放在 `CLAUDE.md` 里那样压在无关的 bug 修复上。

`CLAUDE.md` 的规则对 Skill 也适用：只写下 Claude 自己找不到的东西。

对有副作用的工作流，例如真的去切那个版本，加上 `disable-model-invocation: true`。这样 Claude 不能自己启动这个 Skill，只有你自己输入 `/release` 时才跑。存成 `.claude/skills/release/SKILL.md`，可以像这样：

```markdown
---
name: release
description: 切一个新版本。提升版本号，写更新日志条目，打标签并推送标签，以便 CI 发布。
disable-model-invocation: true
---
1. 确认你在 main 上且工作区干净。否则停下并询问。
2. 运行 `pnpm changeset version` 并提交结果。
3. 把上次标签以来合并的 PR 总结进 CHANGELOG.md，每条一行，只写面向用户的变化。
4. 打标签 `v<新版本>` 并推送标签。CI 从那里发布，绝不从你的机器发布。
```

#### 接上 Claude 需要的工具

Claude 看不见的有些东西完全活在另一个系统里，例如问题跟踪器或错误仪表盘。如果那个系统有 CLI，通常这是最容易的入口。例如装好并登录了 `gh`，Claude 会开 pull request 并读审查评论，不需要你解释。对它没见过的 CLI，指给它 `--help` 就够。

没有 CLI 的系统，有 MCP（Model Context Protocol，模型上下文协议）。从 shell 加一个服务器：

```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

服务器然后出现在会话里的 `/mcp` 下。已连接的服务器即使你不用，也会把工具名和指令加进上下文，所以值得把不需要的关掉。

如果你用的是带类型的语言，代码智能插件让 Claude 直接跳到定义，而不是读很多文件去找。

### 给 Claude 一个能跑的检查

Claude 在工作看起来完成时停下。如果没有什么能跑的东西告诉它工作是否真的完成，「看起来完成」就是它仅有的依据。实践中这使你变成测试套件，每个错误都坐在那里，直到你碰巧注意到。

如果你给它一个返回通过或失败的东西，Claude 可以自己关上这个循环。它做出改动，跑检查，如果有东西坏了，它读输出并修好，然后再跑检查。

给 Claude 一个它能跑、会返回通过或失败的东西。一旦有了，它可以自己继续，你不必盯着。

检查几乎可以是任何东西，只要 Claude 能读到结果：

- 一个测试文件
- 一次构建的退出码
- 一个 linter
- 一个把输出和夹具做 diff 的脚本
- 一张放在设计稿旁边的浏览器截图

如果仓库里已经有其中之一，`CLAUDE.md` 里最有用的一行就是运行它的命令。

检查做到多严由你决定。选项从 Claude 自己决定，一直到 Claude Code 强制执行：

- 在提示里：`之后跑认证测试，一直到它们通过`。Claude 自己决定何时满意。这今天对任何任务都有效，不需要设置。
- 作为目标：`/goal tests/auth 里的测试全部通过且 lint 干净` 设一个条件，每轮之后由另一个模型对照对话检查，Claude 一直继续直到满足。你很少需要在会话里自己用这个。它重要的是长时间的后台运行：Claude 有时会在事项仍开着时用一份进度总结结束一轮，目标会把它送回去。
- 作为 `Stop` hook：每当 Claude 试图结束这一轮，`Stop` hook 跑你的脚本；如果脚本以退出码 2 结束，就把 Claude 送回工作。这一条由 Claude Code（harness）强制，所以这一轮不会结束，直到类型检查通过或达到阻止上限。下面有例子。
- 由没写这段代码的人：在终端里，`/code-review` 在一个从未见过你对话的新子 Agent 里审查 diff。它不会被产生这段代码的推理所左右。

无论用哪个选项，都向 Claude 要证据：它跑的命令和输出，或截图。单独一句「所有测试通过」告诉你的很少，读输出比自己重跑检查更快。对你没看着的会话，这也是你仅有的证据。

Claude 说做完之后，你也可以在会话里跑 `/verify`，让 Claude 构建并运行应用、看结果。这能抓住测试和类型检查会漏掉的那类问题。

#### 对照规格审查

如果你更希望审查对照计划检查工作，而不是一般地找 bug，自己写审查提示：

```text
用一个子 Agent 对照 SPEC.md 审查限流器的 diff，检查每条要求都已实现、列出的边界情况都有测试，报告影响正确性的缺口，跳过风格
```

不要丢掉那句「跳过风格」。被要求找问题的审查者总会找到点什么。如果你修掉每一条发现，最后会多出抽象层，以及为不可能发生的情况写的测试。

#### 用 Stop hook 强制检查

类型检查规则的 `Stop` hook 版本，是 `.claude/settings.json` 里的几行。退出码 2 用来阻止停止。命令打印到 stderr 的内容会作为「还不能结束」的理由回到 Claude，所以编译器输出被重定向到那里：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "pnpm tsc --noEmit 1>&2 || exit 2" }
        ]
      }
    ]
  }
}
```

要看它工作，让 Claude 做一个会破坏类型的改动：它不会结束，而是拿回编译器错误，一直继续直到 `tsc` 通过。如果 hook 连续阻止八次停止、中间没有工具调用，Claude Code 会覆盖下一次阻止并结束这一轮。要提高上限，设置 `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`。

### 强制执行不能有例外的规则

如果某件事必须每次发生，把它做成 hook、拒绝规则或托管设置。`CLAUDE.md` 是给指南的，Claude 被允许判断一条指南不适用。

拿三条你今天可能写在 `CLAUDE.md` 里的规则：`永不读 .env`、`编辑后总是跑格式化`、`不要碰 migrations 文件夹`。Claude 几乎每次都会遵守。对那少数「几乎」不够好的，把它们移出 `CLAUDE.md`，放进 Claude Code（harness）自己应用的配置。从那时起，结果不取决于模型记住或决定了什么。

#### 用 hook 强制步骤

Hook 在 Claude 循环的固定点跑你的某个东西：工具调用之前或之后、Claude 试图停止时、会话开始时，等等。那个东西可以是：

- 一条 shell 命令（通常情况）
- 向一个 HTTP 端点发 POST
- 在你的某个 MCP 服务器上做一次工具调用
- 一个 `prompt` 或 `agent` hook，让一个模型来决定

`prompt` 或 `agent` hook 让另一个模型决定，所以它也不是确定的。真正的强制用 `command` 或 `http` hook，并且如果 hook 自己崩溃或超时也应该停掉该动作，就加上 `onFailure: "block"`。例如一个扫描提交里秘密的 hook，你宁可在扫描器宕机时挡住提交，也不要让它未经扫描就通过。

下面把格式化规则做成 `PostToolUse` hook。它在每次 `Edit` 或 `Write` 之后运行。Claude 记不记得这条规则不再重要，因为跑它的不是 Claude：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "npx prettier --write --ignore-unknown \"$(jq -r '.tool_input.file_path')\"" }
        ]
      }
    ]
  }
}
```

要检查这个 hook，让 Claude 往一个 Prettier 会格式化的文件里加一行缩进很糟的代码。保存后的文件会带着修好的缩进回来。

migrations 规则变成一个 `PreToolUse` hook，对 `migrations/` 下的任何路径以退出码 2 结束。不必自己写：`写一个 hook，阻止对 migrations 文件夹的编辑` 作为提示就行，`/hooks` 会显示结果。但不要做过了：hook 是给零例外的规则的，`Prefer named exports` 有很多例外，所以那一条留在 `CLAUDE.md`。

#### 用权限规则和沙箱限制访问

权限规则决定 Claude 被允许运行、读取和获取什么。`deny` 规则在每种权限模式里都成立，包括 auto 和 `bypassPermissions`，这正是 `.env` 规则该放在那里的原因：

```json
{
  "permissions": {
    "allow": ["Bash(pnpm tsc --noEmit)"],
    "ask": ["Bash(git push *)"],
    "deny": ["Read(./.env)", "Read(./.env.local)", "Read(./secrets/**)"]
  }
}
```

存好之后，问 Claude `.env` 里有什么会失败，无论通过 `Read` 工具还是 `cat .env`。

规则匹配的是工具调用，不是意图，所以值得知道边界在哪：

- `Read` 规则确实会抓住 `cat .env`，因为 Claude Code 认得常见的读文件命令。
- 它抓不住一个打开该文件的脚本。
- 针对某域名的 `WebFetch` 拒绝规则，对 `curl` 到同一域名毫无作用，除非沙箱开着。

要对文件系统或网络访问做操作系统级限制，在会话里用 `/sandbox` 打开沙箱。它在 macOS、Linux 和 WSL2 上约束 Claude 的 shell 命令，并拾起你的 `Read` 拒绝规则和 `WebFetch(domain:...)` 规则，所以与安全相关的事你两者都要。

默认情况下，Claude 仍可以请求在沙箱外重试被阻止的命令，该请求走正常的权限流程。严格沙箱模式在 `/sandbox` 的 Overrides 标签里关掉这个重试。

Auto 模式是一个分类器模型在判断每个动作，不是硬规则。它擅长这个，但和任何判断一样可能错。你也可以调整它把什么当作有风险，组织可以完全关掉它，所以你的「永不」规则属于拒绝规则或 hook。

#### 选择一条规则适用于谁

规则放在哪里，决定它适用于谁：

- `.claude/settings.local.json` 和 `~/.claude/settings.json` 只属于你。当你对一条命令选择 Yes, and don't ask again，Claude Code 把该规则存到本地文件。
- `.claude/settings.json` 和其中的 hook 属于仓库。一旦提交，它们适用于在该仓库工作的所有人。它的拒绝规则立刻适用。它的 `allow` 规则要等到每个人接受该文件夹的信任对话框，工作区信任也决定它的 hook 何时开始在他们的机器上运行。
- 托管设置属于组织。它们来自管理控制台、MDM，或一个 `managed-settings.json` 文件，没有任何个人设置文件能覆盖它们，这使它们成为安全团队策略的唯一位置。如果你是设置它们的人，见 Set up Claude Code for your organization。

无论范围如何，保持被强制的集合小。每个 hook 和拒绝规则偶尔都会在不该触发时触发，而且每一条都得有人维护。如果你发现自己有了四十条，其中大多数大概是 Claude 本来可以自己权衡的偏好。

### 改一个默认

默认好到可以放着不动，直到一个任务花费的时间、token 或打断超过它应有的。发生时，在会话里跑 `/usage`，看它花到哪里去了。

一个新会话已经替你做了若干决定：

- 交互式终端和 VS Code 会话以 auto 模式开始。
- 在多数方案和提供商上，它以中等努力运行 Claude Opus 5.5。
- 它在看到理由时把工作分给子 Agent。
- 对话变长时它做 compaction。

多数时候你从不想这些。当一个任务确实花费超过它应有的，通常是这四者之一。

#### 改权限模式

权限范围的两端都有代价：

- 手动模式：不是只读的每一次编辑和每一条命令都由你自己批准。安全，但第十次提示之后你开始不读就批准，而且你离开键盘时什么都不动。
- `bypassPermissions`：批准拒绝规则和询问规则没有覆盖的一切，这只在一次性容器里说得通。

Auto 模式坐在两者之间，交互式终端和 VS Code 会话从这里开始。Claude 不必为日常批准停下，一个单独的分类器模型在动作运行前按固定顺序检查。它集中在你希望有人拦住的事：

- `curl | bash`
- 生产部署和迁移
- force push 覆盖别人的工作
- 敏感数据发到外部端点
- 看起来由 Claude 读到的内容驱动、而不是由你驱动的动作

Auto 模式阻止一个动作时，你得到通知，该动作出现在 `/permissions` 的 Recently blocked 下，你可以批准以便 Claude 重试。连续三次阻止（或总共二十次）之后，auto 模式暂停，回到询问你。

这些都不替代你的确定控制，因为它在那些控制之后运行。拒绝规则、询问规则和 `PreToolUse` hook 在分类器看到任何东西之前应用，所以拒绝规则在 auto 模式里的阻挡，和其他地方完全一样。沙箱仍然约束它包住的 shell 命令。

你也可以在对话里说 `don't push until I've reviewed`，分类器把这当作阻止信号。它仍然是一个在读记录的模型，句子在对话被压缩时可能丢失，所以真正要紧的东西属于拒绝规则。

相反的问题是分类器反复拦住在你的设置里很日常的事。与其每次手动批准，把它加进 `autoMode.allow`，或在 auto 模式配置里描述你信任的基础设施。这是白话而不是模式，`/auto-mode-setup` 可以从你的项目和最近的会话为你起草 `environment` 部分：

```json
{
  "autoMode": {
    "environment": [
      "$defaults",
      "Source control: github.com/example-org and every repo under it",
      "Trusted internal domains: *.internal.example.com"
    ],
    "allow": [
      "$defaults",
      "Deploying to the staging namespace is fine, it's isolated from production and resets nightly"
    ]
  }
}
```

每个你设置的列表里都保留 `"$defaults"`，因为没有它，你的条目会替换该列表的内置规则，而不是追加。对 `environment` 和 `allow`，你会失去内置上下文和例外；没有它的 `soft_deny` 列表会丢掉对 force push 和生产部署的内置阻止。

`autoMode` 块还必须住在 `~/.claude/settings.json` 而不是项目里，因为分类器忽略项目设置里的 `autoMode`。

如果你更想在每次编辑和命令发生前都看到，会话里的 `Shift+Tab` 会在权限模式之间循环，包括手动模式，或从 shell 用 `claude --permission-mode manual` 开始。如果手动模式问得太频繁，`/fewer-permission-prompts` 扫描最近的记录，找出常见的只读 Bash 和 MCP 调用，并把它们加进 `.claude/settings.json` 的允许列表。

#### 改模型和努力

努力是控制 Claude 想多久的主要旋钮，它替代了人们过去用提示措辞做的大部分事。Claude Opus 5.5、Sonnet 5.5 和 Haiku 5.5 默认是 `medium`，对范围清楚的日常功能工作足够。你会移动它的时候，在会话里用 `/effort`：

- 用 `/effort high` 或 `/effort xhigh` 提高，当做对取决于容易被忽略的情况。想想不是你写的代码里的 bug、不稳定的测试，或 Claude 必须找到旧形状的每一个读者的 schema 变更。Claude 然后会在回答前检查更多边界情况、验证更多自己的工作，额外的时间和 token 花在这里。
- 用 `/effort low` 降低，当你来回很快、反正每步都在审结果：头脑风暴、第一稿、跨几个文件的重命名。Claude 更早给你一个起点；既然你在驾驭每一步，额外的斟酌除了等待不会改变多少。
- 把 `max` 留给你想让 Claude 在没有你的情况下啃的难题，例如寻找安全漏洞。在普通任务上它倾向于想过头，所以你为可能并不比 `high` 更好的答案付更多。
- 当只有下一条消息需要它，例如日常工作中途的一个棘手问题，把 `ultrathink` 放进那条提示，而不是改设置。

模型本身，默认的 Opus 5.5 能处理好大多数编码，Sonnet 在日常工作上更省。Claude Fable 5.1 在你用 `/model fable` 显式选择时可用，Haiku 适合做简单工作的子 Agent。按方案和提供商的完整列表见模型配置。

#### 知道子 Agent 的代价

Claude 会自己把活分给子 Agent：

- 宽的代码库搜索交给内置的 Explore agent。
- 旁路任务在 fork 模式开着时被分叉（这是默认）。
- 它启动的子 Agent 默认在后台跑，所以主对话继续前进。

你很少需要请求这些，但知道你得到什么、它花什么是有帮助的。

子 Agent 在这些情况里划算：

- 同时跑彼此独立的工作，让整个任务更早结束
- 把长输出（例如完整测试运行或宽搜索）留在主对话之外，否则它会在会话余下的时间里一直跟着
- 得到一个没见过代码是怎么写出来的审查者
- 给一个任务比主会话更少的工具，例如一个能读但不能改的审查者

它们的代价主要是 token，因为每个子 Agent 发送自己的请求，并计入与主对话相同的用量。有时也是时间：一个新的子 Agent 首先得收集你的对话已经有的上下文，所以它可能比就地做这个任务更慢。

而且默认它是同一个模型（或更小的一个）做同一个任务。你从中得到的是并行或一双新鲜的眼睛，不是更聪明的答案。

少在它们上花钱：

- 如果子 Agent 的工作简单，例如收集导入某模块的文件或检查文档里的链接，在其定义里设 `model: haiku`。这类工作不需要更大的模型，Haiku 每次请求便宜得多。
- 要求短摘要回来，这样二十条结果也不会填满你的上下文。
- 看 `/usage`，每种子 Agent 占用量的多少，从而判断哪些挣得回成本。
- 给 `.claude/agents/` 里的自定义子 Agent 只给 `tools: Read, Grep, Glob`。现在它是一个不能编辑任何东西的审查者，这个限制由 Claude Code 强制，而不是在提示里请求。

那个审查者是一个短文件 `.claude/agents/reviewer.md`：

```markdown
---
name: reviewer
description: 对照构建所依据的规格审查改过的文件。在实现功能之后、开 PR 之前使用。
tools: Read, Grep, Glob
---
你在审查不是你写的代码。把改过的文件和给你的规格比较，
检查每条要求都已实现、列出的边界情况都有测试，
只报告影响正确性的缺口。跳过风格。
```

让 Claude `have the reviewer compare the rate limiter against SPEC.md`，缺口会回到你的会话，Claude 可以在那里修。

#### 把成本和上下文压下来

多数当前模型有 100 万 token 的窗口，compaction 发生在接近顶部时，你很少会把上下文用完。你仍可能为不需要的上下文付钱。每个请求都发送整个对话，所以一个收集了三个无关任务的会话，会在第四个任务的每一轮重读全部三个。缓存热的时候这是折扣价，过期后是全价。

`/usage` 是第一处要看的地方。在 Pro、Max、Ultra、Team 和 Enterprise 上，它按 Skill、子 Agent、插件和 MCP 服务器分解用量。一旦长上下文或频繁缓存未命中超过用量的 10%，它也会标出这类模式。从那里，通常的修法：

- 无关任务之间用 `/clear`。它不花钱，并意味着下一个任务不必继续为上一个的历史付钱。`/clear oauth-migration` 给正在离开的会话命名，以便稍后回来。
- 带焦点的 `/compact`，例如 `/compact keep the API changes and the test commands`。在长会话上 `/compact` 本身是一个大请求，因为它要读整个对话来总结，缓存过期后更是如此。
- 留意后台工作：一个 `/loop`、目标在每轮之后的检查，以及 Claude 自己的子 Agent，都会在你不打字时继续发请求。

提示缓存在订阅上大约持续一小时，在 API 密钥、云提供商或用量额度上是五分钟。子 Agent 是五分钟，除非你改它。

在一小时缓存上，一个超过大约 20 万 token、闲置着的会话，会在缓存过期前不久被压缩，所以午饭后你从一份总结继续。如果根本不需要历史，一个新会话仍然更便宜。

### 驾驭会话

看第一分钟，Claude 一偏就按 `Esc`，两次修正失败之后跑 `/clear`，写一条更好的提示，而不是第三次修正。

再多配置也替代不了看第一分钟、并在 Claude 走向你没打算的地方时插手。控制只有几个，值得记熟：

- `Esc` 在动作中途停下 Claude，并保留到那一点为止的一切，这样你可以改方向而不丢工作。
- `/rewind`，或在空提示上按两次 `Esc`，打开回退菜单，你可以把代码、对话或两者滚回较早的提示。这使得先试更大胆的做法、不行再回退的风险很低。同一菜单也可以在对话变陈旧时总结其中一部分。
- `/clear` 重新开始。如果你把同一件事纠正了两次仍然错，第三次纠正多半只是往一个已经包含两次失败尝试的对话里加东西，Claude 会继续重读它们。`/clear` 加上一条把你学到的折进去的新提示，几乎每次都更好。

检查点覆盖 Claude 在主对话里用自己的文件工具编辑过的文件，所以只被 Bash 命令碰过的文件不会被恢复。它们和 git 一起工作，而不是替代 git。

两个更小的：`/btw` 回答一个快问题，而不往历史里加任何东西。对跨几天的工作，在会话里 `/rename oauth-migration` 给它命名，这样从 shell 用 `claude --resume oauth-migration` 可以稍后把它捡回来，包括检查点。`claude --continue` 恢复最近的一个。

### 让 Claude 在你不在时跑

一次运行进入无人值守之前，确认它知道完成是什么样、能检查自己的工作、只能碰它该碰的。给它轮数或花费的上限，并让人在最后批准结果。

一旦你不在旁边抓错误，这一页上的每件事都更要紧一点。你看着的时候，Claude 缺一块上下文不是大事：你在一两则消息内注意到并告诉它。在你睡觉前启动的一次运行里，没有人告诉它，第二天早上你发现它整晚都建立在错误假设上。

把一个任务单独留着跑之前，值得带着那个具体任务过这五个问题：

1. 它知道完成是什么样吗？一个目标条件、一份规格文件，或一个它必须转绿的失败测试。
2. 它能检查自己的工作吗？测试套件、一个 `Stop` hook、某种审查步骤。
3. 它被允许碰什么？权限规则、`dontAsk`、沙箱、一个 worktree、它唯一可以推送的分支。
4. 什么让它停下？`--max-turns`、`--max-budget-usd`、花费上限。
5. 结果去哪里，谁签字？一个 PR、一条评论或一份总结，然后一个人批准合并、部署，或任何你不能收回的事。

一旦跑起来，Claude 会自己把一个长任务做完。留在你这里的部分是启动它、决定这次「完成」是什么意思，以及在最后批准合并。

#### 从脚本运行 Claude

`claude -p "prompt"` 跑一次然后退出，这是 Claude Code 进入 CI 任务、git hook 和 shell 循环的方式。

在脚本里你几乎总想再加几个标志：

- `--bare` 跳过 hook、Skill、插件、MCP 服务器和 `CLAUDE.md`（仓库的和机器的都跳过），这样运行在哪里都做同样的事。它也从不碰你的 claude.ai 登录：认证来自 `ANTHROPIC_API_KEY`、你用 `--settings` 传入的文件里的 `apiKeyHelper`，或云提供商的凭证。
- `--append-system-prompt`、`--mcp-config` 和 `--settings` 显式传入这次运行确实需要的东西。
- `--allowedTools` 预先批准它的工具，`--permission-mode dontAsk` 拒绝任何原本会提示的其他东西。
- `--output-format json` 给你一个可解析的结果对象，`stream-json` 配 `--verbose` 在事件发生时流出它们。

合在一起像这样：

```bash
for file in $(cat files.txt); do
  claude --bare -p "Migrate $file to the new logger API and commit. Reply OK or FAIL." \
    --allowedTools "Read,Edit,Bash(git add *),Bash(git commit *)" \
    --permission-mode dontAsk \
    --max-turns 20
done
```

一次运行结束时，Claude 回复 `OK` 或 `FAIL`，碰到轮数上限的运行以错误退出。先在三个文件上试，看哪里出错，修提示，再跑其余的。

如果传入 `--permission-mode auto`，auto 模式也能和 `-p` 一起工作。在非交互运行里，分类器的一次阻止会拒绝那一个动作，Claude 继续；重复阻止不会像在终端里那样暂停运行。依赖它之前，先读阈值在那里如何适用。

#### 按时间表或事件启动运行

一旦运行开始，Claude 可以自己处理其余的。它唯一做不到的是决定开始，所以必须有什么来启动：你、一个计时器，或一个事件，例如失败的 CI 检查或一个新 PR。

在一个打开的会话里，那是 `/loop`，按间隔重复一条提示：

```text
/loop 15m 检查这个分支的 CI，如果是红的，拉取失败任务的日志，修好并推送
```

每次运行是同一会话里的另一轮，所以不要在一个长对话里留着一个一直跑。对笔记本合上时仍应发生的事，`/schedule` 设置一个按计时器运行的云端定时任务。它需要 claude.ai 登录，而不是 API 密钥。你可以让 Claude 加一个 GitHub 事件触发，或在 claude.ai/code/routines 加一个 API 触发。

离开一个云端定时任务跑着之前，用一条该任务无法绕过的 GitHub 分支规则保护 `main`。并且在信任任何新东西无人值守之前，先看它的前几次运行。

#### 并行跑会话

有几块分开的工作同时进行时，给每一块自己的检出，这样编辑不会撞车。`claude -w feature-auth` 在一个新 worktree 里启动会话，桌面应用并排跑若干个，云会话在云上而不是你的机器上跑它们。

worktree 是一份新检出，意味着被 gitignore 的文件如 `.env` 不在那里，依赖也没装。对前者，在仓库根列一份 `.worktreeinclude`（语法与 `.gitignore` 相同），列出你需要的被 gitignore 的文件，Claude Code 会把它们复制进它创建的每个 worktree：

```text
.env
.env.local
config/dev-credentials.json
```

只放小文件：它是复制而不是链接，所以把 `node_modules` 放进去意味着每个 worktree 一份完整拷贝。大目录有 `worktree.symlinkDirectories` 设置，或把安装命令留在 `CLAUDE.md` 里，让 Claude 每次在新检出里开始时运行它。

你很少需要自己清理：

- 退出一个未命名的 worktree 会话时，如果里面没有东西，Claude Code 会移除该 worktree。对命名会话或有改动的会话，它会问怎么办。
- 子 Agent 的 worktree 在子 Agent 没有改动地结束时消失。
- 被留下的子 Agent 和后台会话 worktree，一旦比 `cleanupPeriodDays` 更老且没有工作，就会被清扫。

`claude -p --worktree` 的运行要你自己清理，因为它退出时不问。用 `git worktree remove` 移除；如果 git 因为 worktree 被锁而拒绝，先 `git worktree unlock`。

对跨许多文件的一个大的机械改动，`/batch migrate every handler to the v2 response helpers` 把工作拆成 5 到 30 个单元并给你看计划。然后它在各自的 worktree 里跑每个单元，并为它开一个 PR。从 shell，`claude agents`（仍是研究预览）给你一个屏幕，看机器上后台跑着的一切。

第二个会话也是你能得到的最容易的独立审查者。一个会话写限流器，另一个审查 `@src/middleware/rateLimiter.ts`，而没有看着它被写出来，你再把发现贴回第一个。想法与 `/code-review` 相同，只是消息由你来传。

### 你可以停掉的做法

下面每一条在写下时都是好建议。大多数是对模型当时还不能可靠做到的事的变通，而模型此后已经赶上。如果有几条仍是习惯，这里说明为什么可以放下。

| 旧建议 | 为什么可以停 |
| --- | --- |
| 上下文窗口是主要约束，要积极管理 | 多数当前模型有 100 万 token 窗口，compaction 自己发生，用完是少见的。任务之间 `/clear` 仍值得做，因为聚焦的上下文给你更好的答案，也更便宜。 |
| 给 Claude 一直漏掉的指令加 IMPORTANT 或全大写 | 更老的模型有时需要强调。当前的会遵守措辞平实的一行，堆强调主要让 Claude 过度应用这条规则。如果是不能弯的规则，做成 hook 或拒绝规则。如果这一行在长文件里丢失，文件需要更短。 |
| 用子 Agent 保护上下文窗口 | 用完上下文很少再是问题。子 Agent 对并行工作、把吵闹的输出留在你视线外、以及独立审查仍然很好，但每一项都额外花 token。 |
| 为了更好的答案分给子 Agent | 把同一任务交给子 Agent 不会让答案更好。一个新鲜的审查者确实有帮助，因为它没见过你的推理，这和「把活分出去」是不同的事。 |
| 在提示里写 `think hard`、`think harder`、`be thorough` | 努力才是那个控制。这些短语是普通提示文本，在努力设置之内轻轻推 Claude 一把，而不是抬高它的关键字。`ultrathink` 仍然有效：它要求在那一轮上更深地推理，而不动你的努力设置。 |
| 告诉 Claude 继续、循环直到完成、不要懒 | 当前模型通常会把约定的任务做完，不必被吩咐，这类句子更可能造成过度工作，而不是修一个停顿。给 Claude 一个要通过的检查是不同的，仍然值得做。如果一次运行确实提前停了，说 `continue`；对没人看着的运行，用 `/goal` 或 `Stop` hook 来强制。 |
| 在 `CLAUDE.md` 里描述架构和文件布局 | Claude 自己读仓库。只写下不在那里的东西。 |

如果这一页上的其他建议开始感觉像忙工，那大概也是它属于这张表的信号。

### 相关资源

原文链出的相关文档（路径以官方站点为准）：

- Claude Code 如何工作：循环、工具，以及启动时加载什么
- 探索上下文窗口：会话里什么占空间、何时加载
- 扩展 Claude Code：Skill、hook、MCP、子 Agent 和插件之间怎么选
- 选择权限模式，以及配置权限
- 有效管理成本
- 程序化运行 Claude Code，以及用云端定时任务自动化工作
- 给团队负责人和管理员：为组织设置 Claude Code

## 笔记

- 这篇把「Claude 决定」和「harness 必须执行」分开。`CLAUDE.md` 越写越强调仍然漏掉，就是该挪进 hook 或拒绝规则的信号，不是该再加一行 IMPORTANT。
- 验收信号必须能返回通过或失败。`/goal` 和 `Stop` hook 的差别是：前者仍是另一个模型在看对话，后者是退出码。
- 文末那张「可以停掉的做法」表，和更早的上下文工程文章并不矛盾：窗口变大、compaction 自动发生之后，仍值得在任务之间 `/clear`，因为聚焦更便宜，也更好。

返回 [AI / Agent 阅读清单](./)。
