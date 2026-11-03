---
title: "进阶工具使用"
title_en: "Advanced tool use"
description: "Tool Search Tool、Programmatic Tool Calling 和 Tool Use Examples：按需发现工具、用代码编排调用，并用示例教对参数。"
source: "Anthropic"
source_url: "https://www.anthropic.com/engineering/advanced-tool-use"
date: 2025-11-24
status: "译文"
tags:
  - "工具"
---

# 进阶工具使用

**非官方译文。** 官方原文：[Introducing advanced tool use on the Claude Developer Platform](https://www.anthropic.com/engineering/advanced-tool-use)（Anthropic · Engineering）。

## 导读

工具一多，三个瓶颈会同时出现：定义撑满窗口、中间结果污染上下文、schema 说得清结构却说不清用法。这篇发布 Claude Developer Platform 上的三个 beta 功能来分别对付它们。适合已经在用 MCP、并读过[用代码执行调用 MCP](./code-execution-with-mcp)的人。

原文发表于 2025 年 11 月 24 日。抓取时研究页与这篇 Engineering 正文相同，对照见[研究版](./advanced-tool-use-research)。

## 译文

AI Agent 的未来，是模型在数百乃至数千个工具之间无缝工作。一个 IDE 助手同时接上 git、文件操作、包管理器、测试框架和部署流水线。一个运维协调者同时连上 Slack、GitHub、Google Drive、Jira、公司数据库和几十个 MCP 服务器。

要做出有效的 Agent，它们需要使用无限的工具库，而不把每个定义事先塞进上下文。关于用代码执行调用 MCP 的文章讨论过：工具结果和定义有时会在 Agent 读请求之前吃掉 50,000 以上 token。Agent 应当按需发现并加载工具，只保留与当前任务相关的。

Agent 也需要能从代码里调用工具。用自然语言做工具调用时，每次调用都要一次完整推理，中间结果无论有没有用都会堆进上下文。代码天然适合编排逻辑，例如循环、条件和数据变换。Agent 需要能按手头任务，在代码执行和推理之间选择。

Agent 还需要从示例学习正确的工具用法，而不只是从 schema 定义。JSON schema 定义什么在结构上有效，但表达不了用法模式：何时带上可选参数、哪些组合有意义、你的 API 期望什么约定。

今天他们发布三个使这些成为可能的功能：

- Tool Search Tool：让 Claude 用搜索工具访问数千个工具，而不消耗上下文窗口
- Programmatic Tool Calling：让 Claude 在代码执行环境里调用工具，减轻对模型上下文窗口的影响
- Tool Use Examples：提供一套通用标准，演示如何有效使用给定工具

内部测试里，这些功能帮助他们做出了用常规工具使用模式做不到的东西。例如 Claude for Excel 用 Programmatic Tool Calling 读写有数千行的表格，而不撑爆模型的上下文窗口。

基于这些经验，他们认为这些功能打开了用 Claude 能构建什么的新可能。

### Tool Search Tool

#### 挑战

MCP 工具定义提供重要上下文，但连接的服务器一多，这些 token 会累加。考虑五个服务器：

- GitHub：35 个工具（约 26K token）
- Slack：11 个工具（约 21K token）
- Sentry：5 个工具（约 3K token）
- Grafana：5 个工具（约 3K token）
- Splunk：2 个工具（约 2K token）

那是 58 个工具，在对话开始之前就消耗大约 55K token。再加 Jira 这类服务器（单它就约 17K token），很快接近 10 万以上 token 的开销。在 Anthropic，他们见过优化前工具定义吃掉 134K token。

但 token 成本不是唯一问题。最常见的失败是选错工具和参数不正确，尤其当工具名字相似时，例如 `notification-send-user` 对 `notification-send-channel`。

#### 他们的做法

不是事先加载全部工具定义，Tool Search Tool 按需发现工具。Claude 只看到当前任务真正需要的工具。

图：Tool Search Tool 保留 191,300 token 的上下文，而 Claude 的传统做法是 122,800。图见[原文](https://www.anthropic.com/engineering/advanced-tool-use)。

传统做法：

- 全部工具定义事先加载（50 个以上 MCP 工具约 72K token）
- 对话历史和系统提示争夺剩余空间
- 任何工作开始前的总上下文消耗：约 77K token

用 Tool Search Tool：

- 事先只加载 Tool Search Tool 本身（约 500 token）
- 工具按需发现（3–5 个相关工具，约 3K token）
- 总上下文消耗约 8.7K token，保留 95% 的上下文窗口

这是 token 用量减少 85%，同时仍能访问完整工具库。内部测试显示，在大型工具库上，MCP 评测的准确率显著提高。Opus 4 从 49% 升到 74%，Opus 4.5 在启用 Tool Search Tool 后从 79.5% 升到 88.1%。

#### Tool Search Tool 如何工作

Tool Search Tool 让 Claude 动态发现工具，而不是事先加载全部定义。你把所有工具定义提供给 API，但用 `defer_loading: true` 标记工具，使它们可按需发现。延迟加载的工具一开始不进入 Claude 的上下文。Claude 只看到 Tool Search Tool 本身，加上 `defer_loading: false` 的工具（你最关键、最常用的那些）。

当 Claude 需要特定能力时，它搜索相关工具。Tool Search Tool 返回匹配工具的引用，这些引用在 Claude 的上下文里展开成完整定义。

例如，如果 Claude 需要和 GitHub 交互，它搜索 “github”，只有 `github.createPullRequest` 和 `github.listIssues` 被加载——不是 Slack、Jira 和 Google Drive 里的另外 50 多个工具。

这样 Claude 能访问完整工具库，却只为真正需要的工具付 token。

关于提示缓存：Tool Search Tool 不会破坏提示缓存，因为延迟加载的工具完全被排除在初始提示之外。它们只在 Claude 搜索之后才加入上下文，所以系统提示和核心工具定义仍可缓存。

实现：

```plaintext
{
  "tools": [
    // 包含一个工具搜索工具（正则、BM25 或自定义）
    {"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"},

    // 标记为按需发现
    {
      "name": "github.createPullRequest",
      "description": "Create a pull request",
      "input_schema": {...},
      "defer_loading": true
    }
    // ... 还有数百个 defer_loading: true 的延迟工具
  ]
}
```

对 MCP 服务器，可以延迟加载整个服务器，同时保持特定高频工具已加载：

```plaintext
{
  "type": "mcp_toolset",
  "mcp_server_name": "google-drive",
  "default_config": {"defer_loading": true}, # 延迟加载整个服务器
  "configs": {
    "search_files": {
      "defer_loading": false
    }  // 保持最常用的工具已加载
  }
}
```

Claude Developer Platform 开箱提供基于正则和基于 BM25 的搜索工具，你也可以用嵌入或其他策略实现自定义搜索工具。

#### 何时使用 Tool Search Tool

和任何架构决定一样，启用 Tool Search Tool 有取舍。这个功能在工具调用前加了一步搜索，所以当上下文节省和准确率提升超过额外延迟时，回报最好。

适合使用：

- 工具定义消耗超过 10K token
- 遇到工具选择准确率问题
- 构建由多个服务器驱动的 MCP 系统
- 可用工具在 10 个以上

益处较小：

- 工具库小（少于 10 个）
- 所有工具在每个会话里都频繁使用
- 工具定义很紧凑

### Programmatic Tool Calling

#### 挑战

工作流变复杂时，传统工具调用造成两个根本问题：

- 中间结果造成的上下文污染：Claude 分析一个 10MB 日志文件找错误模式时，整个文件进入上下文窗口，即使 Claude 只需要错误频率的摘要。跨多张表取客户数据时，每条记录都积在上下文里，无论相关与否。这些中间结果吃掉大量 token 预算，甚至可能把重要信息完全挤出窗口。
- 推理开销和手工综合：每次工具调用都要一次完整的模型推理。拿到结果后，Claude 必须「目测」数据以抽出相关信息，推理各部分如何拼合，并决定下一步——全通过自然语言处理。一个五工具的工作流意味着五次推理，加上 Claude 解析每个结果、比较值、综合结论。这又慢又容易错。

#### 他们的做法

Programmatic Tool Calling 让 Claude 通过代码编排工具，而不是通过一次次 API 往返。不是 Claude 一次请求一个工具、每个结果都回到它的上下文，而是 Claude 写代码调用多个工具、处理输出，并控制什么信息真正进入上下文窗口。

Claude 擅长写代码。让它用 Python 而不是自然语言工具调用来表达编排逻辑，你得到更可靠、更精确的控制流。循环、条件、数据变换和错误处理都在代码里显式写出，而不是隐含在 Claude 的推理里。

图：Programmatic Tool Calling 让 Claude 通过代码编排工具，而不是一次次 API 往返，从而可以并行执行工具。图见[原文](https://www.anthropic.com/engineering/advanced-tool-use)。

#### 例子：预算合规检查

考虑一个常见业务任务：「哪些团队成员超出了第三季度差旅预算？」

你有三个工具：

- `get_team_members(department)`：返回带 ID 和级别的团队成员列表
- `get_expenses(user_id, quarter)`：返回某用户的费用明细
- `get_budget_by_level(level)`：返回某员工级别的预算上限

传统做法：

- 取团队成员 → 20 人
- 对每个人取第三季度费用 → 20 次工具调用，每次返回 50–100 条明细（机票、酒店、餐食、收据）
- 按员工级别取预算上限
- 这一切进入 Claude 的上下文：2,000 条以上费用明细（50 KB 以上）
- Claude 手工加总每个人的费用，查他们的预算，把费用和上限比较
- 更多到模型的往返，显著的上下文消耗

用 Programmatic Tool Calling：

不是每个工具结果都回到 Claude，而是 Claude 写一段 Python 脚本编排整个工作流。脚本在 Code Execution 工具（一个沙箱环境）里运行，需要你的工具的结果时暂停。你通过 API 返回工具结果时，它们由脚本处理，而不是被模型消费。脚本继续执行，Claude 只看到最终输出。

预算合规任务里，Claude 的编排代码像这样：

```plaintext
team = await get_team_members("engineering")

# 为每个不同的级别取预算
levels = list(set(m["level"] for m in team))
budget_results = await asyncio.gather(*[
    get_budget_by_level(level) for level in levels
])

# 建查找字典：{"junior": budget1, "senior": budget2, ...}
budgets = {level: budget for level, budget in zip(levels, budget_results)}

# 并行取全部费用
expenses = await asyncio.gather(*[
    get_expenses(m["id"], "Q3") for m in team
])

# 找出超出差旅预算的员工
exceeded = []
for member, exp in zip(team, expenses):
    budget = budgets[member["level"]]
    total = sum(e["amount"] for e in exp)
    if total > budget["travel_limit"]:
        exceeded.append({
            "name": member["name"],
            "spent": total,
            "limit": budget["travel_limit"]
        })

print(json.dumps(exceeded))
```

Claude 的上下文只收到最终结果：那两三个超出预算的人。2,000 条以上的明细、中间加总和预算查找不影响 Claude 的上下文，消耗从 200KB 的原始费用数据降到仅 1KB 的结果。

效率收益很大：

- token 节省：把中间结果留在 Claude 的上下文之外，PTC 大幅减少 token 消耗。复杂研究任务上的平均用量从 43,588 降到 27,297 token，减少 37%。
- 延迟降低：每次 API 往返都要模型推理（数百毫秒到数秒）。当 Claude 在单个代码块里编排 20 次以上工具调用，你省掉 19 次以上推理。API 处理工具执行，而不必每次回到模型。
- 准确率提高：写出显式编排逻辑后，Claude 比在自然语言里同时掂量多个工具结果更少出错。内部知识检索从 25.6% 升到 28.5%；GIA 基准从 46.5% 升到 51.2%。

生产工作流涉及脏数据、条件逻辑和需要扩展的操作。Programmatic Tool Calling 让 Claude 用程序处理这种复杂度，同时把注意力放在可执行的结果上，而不是原始数据处理。

#### 1. 把工具标成可从代码调用

把 code execution 加进工具，并用 `allowed_callers` 选择加入程序化执行的工具：

```plaintext
{
  "tools": [
    {
      "type": "code_execution_20250825",
      "name": "code_execution"
    },
    {
      "name": "get_team_members",
      "description": "Get all members of a department...",
      "input_schema": {...},
      "allowed_callers": ["code_execution_20250825"] # 选择加入程序化工具调用
    },
    {
      "name": "get_expenses",
      ...
    },
    {
      "name": "get_budget_by_level",
      ...
    }
  ]
}
```

API 把这些工具定义转换成 Claude 可以调用的 Python 函数。

#### 2. Claude 写编排代码

不是一次请求一个工具，Claude 生成 Python 代码：

```plaintext
{
  "type": "server_tool_use",
  "id": "srvtoolu_abc",
  "name": "code_execution",
  "input": {
    "code": "team = get_team_members('engineering')\n..." # 上面的代码示例
  }
}
```

#### 3. 工具执行而不进入 Claude 的上下文

代码调用 `get_expenses()` 时，你收到一个带 `caller` 字段的工具请求：

```plaintext
{
  "type": "tool_use",
  "id": "toolu_xyz",
  "name": "get_expenses",
  "input": {"user_id": "emp_123", "quarter": "Q3"},
  "caller": {
    "type": "code_execution_20250825",
    "tool_id": "srvtoolu_abc"
  }
}
```

你提供结果，它在 Code Execution 环境里被处理，而不是在 Claude 的上下文里。代码中的每次工具调用都重复这个请求–响应循环。

#### 4. 只有最终输出进入上下文

代码跑完时，只有代码的结果回到 Claude：

```plaintext
{
  "type": "code_execution_tool_result",
  "tool_use_id": "srvtoolu_abc",
  "content": {
    "stdout": "[{\"name\": \"Alice\", \"spent\": 12500, \"limit\": 10000}...]"
  }
}
```

这就是 Claude 看到的全部，不是沿途处理的 2000 条以上费用明细。

#### 何时使用 Programmatic Tool Calling

Programmatic Tool Calling 给你的工作流加了一步代码执行。当 token 节省、延迟改善和准确率收益很大时，这份额外开销才划算。

最有益：

- 处理大数据集，而你只需要聚合或摘要
- 跑有三次或更多相互依赖的工具调用的多步工作流
- 在 Claude 看到之前过滤、排序或变换工具结果
- 处理中间数据不该影响 Claude 推理的任务
- 对许多条目跑并行操作（例如检查 50 个端点）

益处较小：

- 做简单的单工具调用
- 任务要求 Claude 看到并推理所有中间结果
- 跑响应很小的快速查找

### Tool Use Examples

#### 挑战

JSON Schema 擅长定义结构——类型、必填字段、允许的枚举——但表达不了用法模式：何时包含可选参数、哪些组合有意义、你的 API 期望什么约定。

考虑一个支持工单 API：

```plaintext
{
  "name": "create_ticket",
  "input_schema": {
    "properties": {
      "title": {"type": "string"},
      "priority": {"enum": ["low", "medium", "high", "critical"]},
      "labels": {"type": "array", "items": {"type": "string"}},
      "reporter": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "name": {"type": "string"},
          "contact": {
            "type": "object",
            "properties": {
              "email": {"type": "string"},
              "phone": {"type": "string"}
            }
          }
        }
      },
      "due_date": {"type": "string"},
      "escalation": {
        "type": "object",
        "properties": {
          "level": {"type": "integer"},
          "notify_manager": {"type": "boolean"},
          "sla_hours": {"type": "integer"}
        }
      }
    },
    "required": ["title"]
  }
}
```

schema 定义什么有效，但留下关键问题没答：

- 格式歧义：`due_date` 该用 “2024-11-06”、“Nov 6, 2024”，还是 “2024-11-06T00:00:00Z”？
- ID 约定：`reporter.id` 是 UUID、“USR-12345”，还是仅仅 “12345”？
- 嵌套结构的用法：Claude 何时该填 `reporter.contact`？
- 参数相关：`escalation.level` 和 `escalation.sla_hours` 与优先级如何相关？

这些歧义会导致畸形的工具调用和不一致的参数用法。

#### 他们的做法

Tool Use Examples 让你在工具定义里直接提供示例工具调用。不只依赖 schema，你向 Claude 展示具体的用法模式：

```plaintext
{
    "name": "create_ticket",
    "input_schema": { /* 与上面相同的 schema */ },
    "input_examples": [
      {
        "title": "Login page returns 500 error",
        "priority": "critical",
        "labels": ["bug", "authentication", "production"],
        "reporter": {
          "id": "USR-12345",
          "name": "Jane Smith",
          "contact": {
            "email": "jane@acme.com",
            "phone": "+1-555-0123"
          }
        },
        "due_date": "2024-11-06",
        "escalation": {
          "level": 2,
          "notify_manager": true,
          "sla_hours": 4
        }
      },
      {
        "title": "Add dark mode support",
        "labels": ["feature-request", "ui"],
        "reporter": {
          "id": "USR-67890",
          "name": "Alex Chen"
        }
      },
      {
        "title": "Update API documentation"
      }
    ]
  }
```

从这三个示例，Claude 学到：

- 格式约定：日期用 YYYY-MM-DD，用户 ID 遵循 USR-XXXXX，标签用 kebab-case
- 嵌套结构模式：如何构造带嵌套 contact 对象的 reporter
- 可选参数的相关：严重 bug 有完整联系信息，加上 SLA 很紧的升级；功能请求有报告人但没有联系方式或升级；内部任务只有标题

在他们自己的内部测试里，工具使用示例把复杂参数处理的准确率从 72% 提高到 90%。

#### 何时使用 Tool Use Examples

Tool Use Examples 给工具定义增加 token，所以当准确率提升超过额外成本时最有价值。

最有益：

- 复杂嵌套结构，有效的 JSON 并不意味着正确用法
- 有许多可选参数、且「带不带」的模式很重要的工具
- 带 schema 没捕捉到的领域约定的 API
- 相似工具，示例能澄清该用哪一个（例如 `create_ticket` 对 `create_incident`）

益处较小：

- 用法明显的简单单参数工具
- Claude 已经理解的标准格式，如 URL 或邮箱
- 更适合由 JSON Schema 约束处理的校验问题

### 最佳实践

构建在真实世界里采取行动的 Agent，意味着同时处理规模、复杂度和精度。这三个功能一起工作，解决工具使用工作流里的不同瓶颈。下面是如何有效组合它们。

#### 有策略地分层

不是每个 Agent 的每个任务都需要三个功能全用。从最大的瓶颈开始：

- 工具定义造成的上下文膨胀 → Tool Search Tool
- 大型中间结果污染上下文 → Programmatic Tool Calling
- 参数错误和畸形调用 → Tool Use Examples

这种聚焦的做法让你对付限制 Agent 表现的那个具体约束，而不是事先加复杂度。

然后按需要再加层。它们互补：Tool Search Tool 确保找到对的工具，Programmatic Tool Calling 确保高效执行，Tool Use Examples 确保正确调用。

#### 把 Tool Search Tool 设成更好的发现

工具搜索对照名称和描述匹配，所以清楚、有描述性的定义提高发现准确率。

```plaintext
// 好
{
    "name": "search_customer_orders",
    "description": "Search for customer orders by date range, status, or total amount. Returns order details including items, shipping, and payment info."
}

// 差
{
    "name": "query_db_orders",
    "description": "Execute order query"
}
```

加上系统提示指引，让 Claude 知道有什么可用：

```plaintext
You have access to tools for Slack messaging, Google Drive file management,
Jira ticket tracking, and GitHub repository operations. Use the tool search
to find specific capabilities.
```

让最常用的三到五个工具始终加载，其余延迟。这在常见操作的即时访问和其余一切的按需发现之间取得平衡。

#### 把 Programmatic Tool Calling 设成正确执行

既然 Claude 写代码来解析工具输出，就把返回格式写清楚。这帮助 Claude 写出正确的解析逻辑：

```plaintext
{
    "name": "get_orders",
    "description": "Retrieve orders for a customer.
Returns:
    List of order objects, each containing:
    - id (str): Order identifier
    - total (float): Order total in USD
    - status (str): One of 'pending', 'shipped', 'delivered'
    - items (list): Array of {sku, quantity, price}
    - created_at (str): ISO 8601 timestamp"
}
```

下面这些选择加入的工具受益于程序化编排：

- 可以并行跑的工具（彼此独立的操作）
- 重试安全的操作（幂等）

#### 把 Tool Use Examples 设成参数准确

为行为清晰而制作示例：

- 用真实数据（真实城市名、可信的价格，而不是 “string” 或 “value”）
- 用最小、部分和完整规格的模式展示多样性
- 保持简短：每个工具 1–5 个示例
- 聚焦歧义（只在正确用法不能从 schema 明显看出时加示例）

### 开始使用

这些功能处于 beta。要启用它们，加上 beta 头，并包含你需要的工具：

```plaintext
client.beta.messages.create(
    betas=["advanced-tool-use-2025-11-20"],
    model="claude-sonnet-4-5-20250929",
    max_tokens=4096,
    tools=[
        {"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"},
        {"type": "code_execution_20250825", "name": "code_execution"},
        # 你的工具，带 defer_loading、allowed_callers 和 input_examples
    ]
)
```

详细 API 文档和 SDK 示例见原文链出的：

- Tool Search Tool 的文档和 cookbook
- Programmatic Tool Calling 的文档和 cookbook
- Tool Use Examples 的文档

这些功能把工具使用从简单的函数调用，推向智能编排。当 Agent 处理跨越几十个工具和大数据集的更复杂工作流时，动态发现、高效执行和可靠调用成为基础。

### 致谢

作者为 Bin Wu，贡献来自 Adam Jones、Artur Renault、Henry Tay、Jake Noble、Noah Picard、Sam Jiang 以及 Claude Developer Platform 团队。这项工作建立在 Chris Gorgolewski、Daniel Jiang、Jeremy Fox 和 Mike Lambert 的基础研究之上。他们也从 AI 生态各处获得启发，包括 Joel Pobar 的 LLMVM、Cloudflare 的 Code Mode，以及 Code Execution as MCP。特别感谢 Andy Schumeister、Hamish Kerr、Keir Bradwell、Matt Bleifer 和 Molly Vorwerck。

## 笔记

- 三个功能对三个不同的失败：找错工具、中间结果淹没窗口、参数格式猜错。不必一次全开，从最大的瓶颈加。
- 文中的准确率变化幅度不一样：Tool Search 在 Opus 4 上从 49% 到 74% 是大步；PTC 在知识检索上从 25.6% 到 28.5% 是小步。读的时候按任务类型看，不要合成一个「工具变好了」的总数。
- `defer_loading` 被排除在初始提示之外，所以不破坏提示缓存。这是它和「把工具定义全塞进系统提示再靠缓存」的差别。

返回 [AI / Agent 阅读清单](./)。
