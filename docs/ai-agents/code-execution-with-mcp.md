---
title: "用代码执行调用 MCP"
title_en: "Code execution with MCP"
description: "把 MCP 服务器呈现成代码 API，按需加载工具定义，并在执行环境里处理中间结果。"
source: "Anthropic"
source_url: "https://www.anthropic.com/engineering/code-execution-with-mcp"
date: 2025-11-04
status: "译文"
tags:
  - "MCP"
  - "代码执行"
---

# 用代码执行调用 MCP

**非官方译文。** 官方原文：[Code execution with MCP: Building more efficient agents](https://www.anthropic.com/engineering/code-execution-with-mcp)（Anthropic · Engineering）。

## 导读

MCP 把工具接上之后，新的瓶颈是上下文：工具定义和中间结果都要穿过模型。这篇讲把 MCP 服务器当成代码 API，让 Agent 写代码去调用，只把需要的定义和结果带回窗口。适合工具已经多到上千、延迟和账单开始疼的人。

原文发表于 2025 年 11 月 4 日。作者为 Adam Jones 与 Conor Kelly。

## 译文

MCP（Model Context Protocol，模型上下文协议）是把 AI Agent 连到外部系统的开放标准。传统上，把 Agent 连到工具和数据，每一对都要定制集成，造成碎片化和重复劳动，真正连通的系统很难做大。MCP 提供一套通用协议：开发者在 Agent 里实现一次 MCP，就打开整个集成生态。

自 2024 年 11 月发布以来，采用很快：社区建了数千个 MCP 服务器，各主要编程语言都有 SDK，行业把 MCP 当成连接 Agent 与工具、数据的事实标准。

今天，开发者经常做能访问数百乃至数千个工具、跨几十个 MCP 服务器的 Agent。但连接的工具一多，事先载入全部工具定义、再让中间结果穿过上下文窗口，会拖慢 Agent 并增加成本。

这篇探讨代码执行如何让 Agent 更高效地与 MCP 服务器交互：处理更多工具，同时用更少的 token。

### 工具的过度 token 消耗让 Agent 更低效

MCP 用量变大时，有两种常见模式会增加成本和延迟：

1. 工具定义撑满上下文窗口；
2. 中间工具结果再吃掉额外 token。

#### 1. 工具定义撑满上下文窗口

多数 MCP 客户端事先把全部工具定义直接载入上下文，用直接的工具调用语法暴露给模型。定义可能像这样：

```plaintext
gdrive.getDocument
     Description: 从 Google Drive 取回一份文档
     Parameters:
                documentId (required, string): 要取回的文档 ID
                fields (optional, string): 要返回的特定字段
     Returns: 带标题、正文、元数据、权限等的文档对象
```

```plaintext
salesforce.updateRecord
    Description: 更新 Salesforce 中的一条记录
    Parameters:
               objectType (required, string): Salesforce 对象类型（Lead、Contact、Account 等）
               recordId (required, string): 要更新的记录 ID
               data (required, object): 要更新的字段及其新值
     Returns: 带确认信息的已更新记录对象
```

工具描述占用更多窗口空间，增加响应时间和成本。Agent 连着数千个工具时，读请求之前可能就要处理数十万 token。

#### 2. 中间工具结果再吃掉额外 token

多数 MCP 客户端允许模型直接调用 MCP 工具。例如你对 Agent 说：「从 Google Drive 下载我的会议记录，并把它附到 Salesforce 的线索上。」

模型会做出这样的调用：

```plaintext
TOOL CALL: gdrive.getDocument(documentId: "abc123")
        → 返回 "Discussed Q4 goals...\n[完整记录文本]"
           （载入模型上下文）

TOOL CALL: salesforce.updateRecord(
			objectType: "SalesMeeting",
			recordId: "00Q5f000001abcXYZ",
  			data: { "Notes": "Discussed Q4 goals...\n[完整记录文本再次写一遍]" }
		)
		（模型需要把整份记录再写进上下文）
```

每个中间结果都必须穿过模型。这个例子里，完整通话记录流过两次。两小时的销售会议，可能意味着再处理 50,000 token。更大的文档甚至可能超出窗口，把工作流打断。

文档大或数据结构复杂时，模型在工具调用之间抄数据，也更容易出错。

图：MCP 客户端把工具定义载入模型的上下文窗口，并编排消息循环，使每次工具调用和结果都在操作之间穿过模型。图见[原文](https://www.anthropic.com/engineering/code-execution-with-mcp)。

### 用代码执行调用 MCP，提高上下文效率

Agent 的代码执行环境越来越常见。一个办法是把 MCP 服务器呈现为代码 API，而不是直接的工具调用。Agent 然后写代码与 MCP 服务器交互。这同时对付两个挑战：Agent 可以只加载需要的工具，并在执行环境里处理数据，再把结果交回模型。

做法有多种。一种是从已连接的 MCP 服务器生成全部可用工具的文件树。下面是用 TypeScript 的一种实现：

```plaintext
servers
├── google-drive
│   ├── getDocument.ts
│   ├── ... （其他工具）
│   └── index.ts
├── salesforce
│   ├── updateRecord.ts
│   ├── ... （其他工具）
│   └── index.ts
└── ... （其他服务器）
```

每个工具对应一个文件，例如：

```plaintext
// ./servers/google-drive/getDocument.ts
import { callMCPTool } from "../../../client.js";

interface GetDocumentInput {
  documentId: string;
}

interface GetDocumentResponse {
  content: string;
}

/* 从 Google Drive 读取一份文档 */
export async function getDocument(input: GetDocumentInput): Promise<GetDocumentResponse> {
  return callMCPTool<GetDocumentResponse>('google_drive__get_document', input);
}
```

上面从 Google Drive 到 Salesforce 的例子变成这段代码：

```plaintext
// 从 Google Docs 读取记录，并加到 Salesforce 潜在客户上
import * as gdrive from './servers/google-drive';
import * as salesforce from './servers/salesforce';

const transcript = (await gdrive.getDocument({ documentId: 'abc123' })).content;
await salesforce.updateRecord({
  objectType: 'SalesMeeting',
  recordId: '00Q5f000001abcXYZ',
  data: { Notes: transcript }
});
```

Agent 通过探索文件系统发现工具：列出 `./servers/` 目录找到可用服务器（如 `google-drive` 和 `salesforce`），再读取它需要的具体工具文件（如 `getDocument.ts` 和 `updateRecord.ts`）以理解接口。这样 Agent 只加载当前任务需要的定义。token 用量从 150,000 降到 2,000，时间和成本节省 98.7%。

Cloudflare 发表过类似发现，把用代码执行调用 MCP 称为 “Code Mode”。核心洞见相同：LLM 擅长写代码，开发者应利用这个长处，做出与 MCP 服务器交互更高效的 Agent。

### 用代码执行调用 MCP 的好处

这种方式让 Agent 更高效地使用上下文：按需加载工具，在数据到达模型之前过滤，并在一步里执行复杂逻辑。安全和状态管理上也有好处。

#### 渐进披露

模型很擅长在文件系统里导航。把工具呈现为文件系统上的代码，模型就可以按需读工具定义，而不是事先全部读完。

也可以在服务器上加一个 `search_tools` 工具来找相关定义。例如面对上面那个假设的 Salesforce 服务器，Agent 搜索 “salesforce”，只加载当前任务需要的工具。在 `search_tools` 里加上详细程度参数，让 Agent 选择需要的细节级别（仅名称、名称加描述，或带 schema 的完整定义），也有助于节省上下文并高效找工具。

#### 上下文高效的工具结果

处理大数据集时，Agent 可以在代码里过滤和变换结果再返回。考虑取一份 10,000 行的表格：

```plaintext
// 没有代码执行：所有行都流过上下文
TOOL CALL: gdrive.getSheet(sheetId: 'abc123')
        → 把 10,000 行返回到上下文里，再手工过滤

// 有代码执行：在执行环境里过滤
const allRows = await gdrive.getSheet({ sheetId: 'abc123' });
const pendingOrders = allRows.filter(row => 
  row["Status"] === 'pending'
);
console.log(`Found ${pendingOrders.length} pending orders`);
console.log(pendingOrders.slice(0, 5)); // 只打印前 5 行供查看
```

Agent 看到的是五行，不是 10,000 行。聚合、跨多个数据源连接、或抽取特定字段，都可以用类似模式，而不把窗口撑大。

#### 更强、也更省上下文的控制流

循环、条件和错误处理可以用熟悉的代码模式完成，而不是把一次次工具调用串起来。例如需要 Slack 里的部署通知时，Agent 可以写：

```plaintext
let found = false;
while (!found) {
  const messages = await slack.getChannelHistory({ channel: 'C123456' });
  found = messages.some(m => m.text.includes('deployment complete'));
  if (!found) await new Promise(r => setTimeout(r, 5000));
}
console.log('Deployment notification received');
```

这比在 Agent 循环里交替做 MCP 工具调用和 sleep 更高效。

另外，写出一棵会被执行的条件树，也能节省「首 token 时间」延迟：不必等模型去评估一条 if，可以让代码执行环境来做。

#### 保护隐私的操作

Agent 用代码执行调用 MCP 时，中间结果默认留在执行环境里。Agent 只看到你显式打印或返回的内容。你不想分享给模型的数据，可以流过工作流，却从不进入模型上下文。

对更敏感的工作负载，Agent 的 harness（任务脚手架）可以自动把敏感数据令牌化。例如要把表格里的客户联系方式导入 Salesforce。Agent 写：

```plaintext
const sheet = await gdrive.getSheet({ sheetId: 'abc123' });
for (const row of sheet.rows) {
  await salesforce.updateRecord({
    objectType: 'Lead',
    recordId: row.salesforceId,
    data: { 
      Email: row.email,
      Phone: row.phone,
      Name: row.name
    }
  });
}
console.log(`Updated ${sheet.rows.length} leads`);
```

MCP 客户端在数据到达模型之前拦截并令牌化个人身份信息（PII）：

```plaintext
// 如果 Agent 打印了 sheet.rows，它会看到：
[
  { salesforceId: '00Q...', email: '[EMAIL_1]', phone: '[PHONE_1]', name: '[NAME_1]' },
  { salesforceId: '00Q...', email: '[EMAIL_2]', phone: '[PHONE_2]', name: '[NAME_2]' },
  ...
]
```

当数据在另一次 MCP 工具调用里被分享时，MCP 客户端通过查找把令牌还原。真实的邮箱、电话和姓名从 Google Sheets 流到 Salesforce，但从不穿过模型。这防止 Agent 意外记录或处理敏感数据。也可以用它定义确定的安全规则，选择数据可以从哪里流到哪里。

#### 状态持久化与 Skill

带文件系统访问的代码执行，让 Agent 能跨操作维持状态。Agent 可以把中间结果写到文件，以便恢复工作和跟踪进度：

```plaintext
const leads = await salesforce.query({ 
  query: 'SELECT Id, Email FROM Lead LIMIT 1000' 
});
const csvData = leads.map(l => `${l.Id},${l.Email}`).join('\n');
await fs.writeFile('./workspace/leads.csv', csvData);

// 稍后的执行从上次停下的地方继续
const saved = await fs.readFile('./workspace/leads.csv', 'utf-8');
```

Agent 也可以把自己的代码存成可复用函数。一旦为某任务写出能工作的代码，就可以存下来以后用：

```plaintext
// 在 ./skills/save-sheet-as-csv.ts
import * as gdrive from './servers/google-drive';
export async function saveSheetAsCsv(sheetId: string) {
  const data = await gdrive.getSheet({ sheetId });
  const csv = data.map(row => row.join(',')).join('\n');
  await fs.writeFile(`./workspace/sheet-${sheetId}.csv`, csv);
  return `./workspace/sheet-${sheetId}.csv`;
}

// 稍后，在任意一次 Agent 执行里：
import { saveSheetAsCsv } from './skills/save-sheet-as-csv';
const csvPath = await saveSheetAsCsv('abc123');
```

这和 Skill 的概念紧密相关：Skill 是一组可复用的指令、脚本和资源，用来提高模型在专门任务上的表现。给这些存下来的函数加上 `SKILL.md`，就成为一个结构化技能，模型可以引用和使用。随时间推移，Agent 能建立起更高层能力的工具箱，演化它最有效工作所需的脚手架。

注意：代码执行会带来自己的复杂度。运行 Agent 生成的代码，需要安全的执行环境，有适当的沙箱、资源限制和监控。这些基础设施要求增加运维开销和安全考量，而直接工具调用可以避开。代码执行的好处——更低的 token 成本、更低的延迟、更好的工具组合——应当与这些实现成本放在一起权衡。

### 小结

MCP 为 Agent 连接许多工具和系统提供了基础协议。但一旦连接的服务器太多，工具定义和结果会消耗过多 token，降低 Agent 效率。

这里的许多问题感觉很新——上下文管理、工具组合、状态持久化——但在软件工程里已有已知解法。代码执行把这些既有模式用到 Agent 上，让它们用熟悉的编程构造更高效地与 MCP 服务器交互。如果实现了这种方法，他们鼓励你把发现分享给 MCP 社区。

### 致谢

作者为 Adam Jones 与 Conor Kelly。感谢 Jeremy Fox、Jerome Swannack、Stuart Ritchie、Molly Vorwerck、Matt Samuels 和 Maggie Vo 对草稿的反馈。

## 笔记

- 150,000 降到 2,000 token（98.7%）是这篇的核心数字：省的是「事先看见所有工具定义」，不是模型变聪明了。
- PII 令牌化发生在 harness 里，模型上下文里只有占位符。这和直接工具调用不同，安全边界在执行环境。
- 把能工作的脚本存成 `SKILL.md`，是这篇和[用 Agent Skills 装备 Agent](./agent-skills)的接口。

返回 [AI / Agent 阅读清单](./)。
