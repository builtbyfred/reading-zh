---
title: "做一个有主见的极简编码 Agent，我学到了什么"
title_en: "What I learned building an opinionated and minimal coding agent"
description: "Mario Zechner 写 Pi 的一手长文：极简系统提示、四个工具、默认不拦权限，以及他为什么认为现有 harness 做不了上下文工程。"
source: "Mario Zechner"
source_url: "https://mariozechner.at/posts/2025-11-30-pi-coding-agent/"
date: 2025-11-30
status: "译文"
tags:
  - "Pi"
  - "harness"
  - "上下文工程"
  - "Claude Code"
---

# 做一个有主见的极简编码 Agent，我学到了什么

**非官方译文。** 官方原文：[What I learned building an opinionated and minimal coding agent](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)（Mario Zechner · 2025-11-30）。正文是中文译文。图、视频和可交互演示不嵌在本页，链回原文。英文原文留在作者站点。

## 导读

这篇是 Pi（有主见的极简 coding agent）作者 Mario Zechner 的一手长文，写他为什么自己做一个尽量薄的 coding agent harness（任务脚手架），而不是继续把 Claude Code 当日常驱动。适合已经用过编码代理、想看外壳里到底该放什么的人。

本站清单里，[构建高效的 AI Agent](./building-effective-agents) 先分清工作流和 Agent；[AI Agent 的有效上下文工程](./effective-context-engineering-for-ai-agents) 问的是上下文里放什么、何时放。这篇把后一个问题做成了产品决定：系统提示极短，默认只有四个工具，不内建 MCP（Model Context Protocol，模型上下文协议）、plan mode（计划模式）、待办和子 Agent。和 [Claude Code 最佳实践](./claude-code-best-practices)、[长时运行应用的 Harness 设计](./harness-design-long-running-apps) 对看：一边把阶段、权限和子任务收进 harness，一边把状态放到文件、bash 和 tmux 里。

它不是 Anthropic 的官方说法，也不是功能手册。逐项对照见 [Claude Code 与 Pi Agent 功能对照](./pi-vs-claude-code)。那张表写的是更晚的 Pi v0.52.10（2026 年 2 月），和这篇 2025-11-30 的长文不是同一时刻。产品页、演讲、仓库和二次摘要不单建页，链在文末笔记。

## 译文

文首图的图注大意是「东西不多，但是我的」。[图见原文](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)。

过去三年我一直在用大语言模型辅助写代码。你如果读到这里，大概走过同一条路：先把代码贴进 [ChatGPT](https://chatgpt.com)，再到 [Copilot](https://github.com/features/copilot) 的自动补全（对我从来没好用过），再到 [Cursor](https://cursor.com)，最后是 2025 年变成日常驱动的新一代 coding agent harness，比如 [Claude Code](https://claude.ai/code)、[Codex](https://github.com/openai/codex)、[Amp](https://ampcode.com)、[Droid](https://factory.ai) 和 [opencode](https://opencode.ai)。

我大部分工作更喜欢 Claude Code。用了一年半 Cursor 之后，四月份我第一个试的就是它。那时候它朴素得多。这正好适合我：我就是喜欢简单、行为可预期的工具。这几个月里，Claude Code 变成了一艘飞船，八成功能我用不上。[系统提示和工具每次发布都会改](https://mariozechner.at/posts/2025-08-03-cchistory/)，工作流被打断，模型行为也变了。我讨厌这个。而且界面还会闪。

这些年我也做过不少 Agent，复杂度各不相同。比如我那个小小的浏览器使用 Agent [Sitegeist](https://sitegeist.ai)，本质上就是住在浏览器里的 coding agent。做这些的时候我学到，上下文工程（context engineering）是第一位的。精确控制什么进模型的上下文，输出会更好，写代码时尤其如此。现有 harness 把这件事做得极难，或者根本做不到：它们在你背后往上下文里塞东西，界面上还不显示。

说到「显示」，我想检查自己和模型交互的每一个方面。基本上没有 harness 允许这样做。我还想要一份文档清楚的会话（session）格式，方便事后自动处理，以及一种简单的办法，在 Agent 核心上面做别的界面。现有 harness 有的能做到一部分，但那些 API 闻起来像是一路长出来的，沿途背上了历史包袱，开发体验能看出来。这不是在怪谁。一旦有很多人在用你的东西，你就得多少保持向后兼容，这是代价。

我也折腾过自托管，本地和 [DataCrunch](https://datacrunch.io) 上都试过。有些 harness（比如 opencode）支持自托管模型，但通常不好用。主要是因为它们依赖 [Vercel AI SDK](https://sdk.vercel.ai/) 这类库。不知为什么，这套库和自托管模型合不来，工具调用尤其如此。

一个对着各种 Claude 嚷嚷的老家伙还能怎么办？他自己写一个 coding agent harness，起一个根本搜不到的名字，这样就永远不会有用户，GitHub issue 上也永远不会有问题。能有多难呢？

要做成这件事，我得做出这些东西：

- **[pi-ai](https://github.com/badlogic/pi-mono/tree/main/packages/ai)**：统一的 LLM API，支持多家提供方（Anthropic、OpenAI、Google、xAI、Groq、Cerebras、OpenRouter，以及任何 OpenAI 兼容端点），流式输出，用 TypeBox schema 做工具调用，支持思考 / 推理，能做 context handoff（跨提供方交接上下文），并统计 token 和费用。
- **[pi-agent-core](https://github.com/badlogic/pi-mono/tree/main/packages/agent)**：Agent 循环，负责执行工具、做校验、把事件流出来。
- **[pi-tui](https://github.com/badlogic/pi-mono/tree/main/packages/tui)**：很小的终端界面框架，用 differential rendering（差分渲染）和同步输出，做到几乎不闪，并带有自动补全编辑器和 Markdown 渲染这类组件。
- **[pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent)**：真正的命令行程序，把上面几块接起来，加上会话管理、自定义工具、主题和项目上下文文件。

我在这件事上的原则是：我用不上的，就不做。而我用不上的东西很多。

### pi-ai 与 pi-agent-core

这个包的 API 细节我不打算拿来烦你，都写在 [README.md](https://github.com/badlogic/pi-mono/blob/main/packages/ai/README.md) 里。我想记的是，做一套统一 LLM API 时撞上了哪些问题、我怎么处理的。我不说这些办法是最好的，但它们在好几个 Agent 项目和非 Agent 的 LLM 项目里都还好用。

#### 其实只要四套 API

原小节标题借用了「There are four lights」的句式，停在 lights 上，改口说 API。意思是：要跟几乎所有模型服务商说话，其实只要四套 API。[OpenAI 的 Completions API](https://platform.openai.com/docs/api-reference/chat/create)、他们较新的 [Responses API](https://platform.openai.com/docs/api-reference/responses)、[Anthropic 的 Messages API](https://docs.anthropic.com/en/api/messages)，以及 [Google 的 Generative AI API](https://ai.google.dev/api)。

功能大体相近，所以在上面做一层抽象不是什么高深学问。当然，各家有各家的怪癖。Completions API 尤其如此：几乎所有提供方都说这套 API，但每家对「它该做什么」理解不同。比如 OpenAI 自己的 Completions API 不支持推理轨迹，别的提供方在他们那一版里却支持。推理引擎也一样，比如 [llama.cpp](https://github.com/ggml-org/llama.cpp)、[Ollama](https://ollama.com/)、[vLLM](https://github.com/vllm-project/vllm) 和 [LM Studio](https://lmstudio.ai/)。

举个例子，在 [openai-completions.ts](https://github.com/badlogic/pi-mono/blob/main/packages/ai/src/providers/openai-completions.ts) 里：

- Cerebras、xAI、Mistral、Chutes 不喜欢 `store` 字段
- Mistral 和 Chutes 用 `max_tokens`，不用 `max_completion_tokens`
- Cerebras、xAI、Mistral、Chutes 不支持用 `developer` 角色放系统提示
- Grok 模型不喜欢 `reasoning_effort`
- 不同提供方把推理内容放在不同字段里（`reasoning_content` 或 `reasoning`）

为了让这些功能在多得吓人的提供方上真的能用，pi-ai 有一套覆盖面相当广的测试：图像输入、推理轨迹、工具调用，以及你期望 LLM API 具备的其他功能。测试跑在所有支持的提供方和常见模型上。这是认真在做，但仍然不能保证新模型和新提供方开箱即用。

另一大差别是各家怎么报告 token，以及缓存的读和写。Anthropic 的做法最清醒，其余大体是蛮荒西部。有的在 SSE（服务器发送事件）流一开始就给 token 数，有的只在结束时给。请求如果中途中止，就没法准确计费。更气人的是，你不能传一个唯一 ID，事后去对账单 API，弄清哪个用户花了多少 token。所以 pi-ai 的 token 和缓存统计是尽力而为：自己用够了，但如果终端用户通过你的服务消耗 token，它不够做精确账单。

特别点名 Google：直到本文写作时，他们似乎仍不支持工具调用的流式返回。这很 Google。

pi-ai 也能在浏览器里跑，做 Web 界面时用得上。有些提供方把这件事做得特别容易，因为他们支持 CORS，具体是 Anthropic 和 xAI。

#### 跨提供方交接上下文

context handoff 从一开始就是 pi-ai 要做的功能。每家跟踪工具调用和思考轨迹的方式都不同，所以这只能尽力而为。比如会话进行到一半从 Anthropic 换到 OpenAI，Anthropic 的思考轨迹会被转成助手消息里的内容块，用 `<thinking>` 和 `</thinking>` 包起来。这合不合理两说，因为 Anthropic 和 OpenAI 返回的思考轨迹，并不真的代表幕后在发生什么。

这些提供方还会往事件流里插入签名过的数据块。后面的请求如果带上同样的消息，你得把这些块重放回去。同一家内部换模型也一样。于是后台就有一条又笨重又绕的抽象和转换流水线。

可以高兴地报告：跨提供方交接，以及上下文的序列化和反序列化，在 pi-ai 里相当能用。下面保留 API 名称，注释按原文译成中文。完整示例见[原文这一节](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/#toc_2)。

```ts
import { getModel, complete, Context } from '@mariozechner/pi-ai';

// 从 Claude 开始
const claude = getModel('anthropic', 'claude-sonnet-4-5');
const context: Context = {
  messages: []
};

context.messages.push({ role: 'user', content: '25 乘 18 是多少？' });
const claudeResponse = await complete(claude, context, {
  thinkingEnabled: true
});
context.messages.push(claudeResponse);

// 换到 GPT：它会把 Claude 的思考看成带 thinking 标签的文本
const gpt = getModel('openai', 'gpt-5.1-codex');
context.messages.push({ role: 'user', content: '这个结果对吗？' });
const gptResponse = await complete(gpt, context);
context.messages.push(gptResponse);

// 再换到 Gemini
const gemini = getModel('google', 'gemini-2.5-flash');
context.messages.push({ role: 'user', content: '刚才的问题是什么？' });
const geminiResponse = await complete(gemini, context);

// 把上下文序列化成 JSON（存储、传递，等等）
const serialized = JSON.stringify(context);

// 之后：反序列化，用任意模型接着聊
const restored: Context = JSON.parse(serialized);
restored.messages.push({ role: 'user', content: '总结一下我们的对话' });
const continuation = await complete(claude, restored);
```

#### 我们活在多模型的世界里

说到模型，我希望 `getModel` 在类型上是安全的。为此需要一份模型注册表，再从它生成 TypeScript 类型。我把 [OpenRouter](https://openrouter.ai/) 和 [models.dev](https://models.dev/) 的数据解析进 [models.generated.ts](https://github.com/badlogic/pi-mono/blob/main/packages/ai/src/models.generated.ts)。models.dev 是 opencode 的人做的，谢谢，非常有用。这里面包括 token 价格，以及图像输入、思考支持这类能力。

如果要加一个注册表里没有的模型，我希望类型系统让这件事很容易。自托管模型、models.dev 或 OpenRouter 上还没有的新发布，或者某家偏门的 LLM 提供方，都用得上：

```ts
import { Model, stream } from '@mariozechner/pi-ai';

const ollamaModel: Model<'openai-completions'> = {
  id: 'llama-3.1-8b',
  name: 'Llama 3.1 8B (Ollama)',
  api: 'openai-completions',
  provider: 'ollama',
  baseUrl: 'http://localhost:11434/v1',
  reasoning: false,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000,
  maxTokens: 32000
};

const response = await stream(ollamaModel, context, {
  apiKey: 'dummy' // Ollama 不需要真的密钥
});
```

很多统一 LLM API 完全不管怎么中止请求。你要是想把 LLM 接进任何一种生产系统，这完全不能接受。很多统一 API 也不把部分结果还给你，这有点荒唐。pi-ai 从一开始就让整条流水线都能中止，包括工具调用。用法是这样的：

```ts
import { getModel, stream } from '@mariozechner/pi-ai';

const model = getModel('openai', 'gpt-5.1-codex');
const controller = new AbortController();

// 两秒后中止
setTimeout(() => controller.abort(), 2000);

const s = stream(model, {
  messages: [{ role: 'user', content: '写一个长故事' }]
}, {
  signal: controller.signal
});

for await (const event of s) {
  if (event.type === 'text_delta') {
    process.stdout.write(event.delta);
  } else if (event.type === 'error') {
    console.log(`${event.reason === 'aborted' ? '已中止' : '出错'}:`, event.error.errorMessage);
  }
}

// 取结果（中止时可能只是一部分）
const response = await s.result();
if (response.stopReason === 'aborted') {
  console.log('部分内容:', response.content);
}
```

#### 拆开的工具结果

还有一层抽象，我在别的统一 LLM API 里没见过：把工具结果拆成交给 LLM 的那一份，和给界面显示的那一份。交给 LLM 的通常只是文本或 JSON，里面不一定有界面上想展示的全部信息。再去解析文本形式的工具输出、重新拼成界面，也非常痛苦。pi-ai 的工具实现允许同时返回给 LLM 的内容块，和单独给界面渲染的内容块。工具还可以返回图像这类附件，按对应提供方的原生格式附上去。工具参数用 [TypeBox](https://github.com/sinclairzx81/typebox) schema 和 [AJV](https://ajv.js.org/) 自动校验，失败时给出具体错误信息。

```ts
import { Type, AgentTool } from '@mariozechner/pi-ai';

const weatherSchema = Type.Object({
  city: Type.String({ minLength: 1 }),
});

const weatherTool: AgentTool<typeof weatherSchema, { temp: number }> = {
  name: 'get_weather',
  description: '获取某座城市的当前天气',
  parameters: weatherSchema,
  execute: async (toolCallId, args) => {
    const temp = Math.round(Math.random() * 30);
    return {
      // 给 LLM 的文本
      output: `${args.city} 的气温：${temp}°C`,
      // 给界面的结构化数据
      details: { temp }
    };
  }
};
```

工具也可以返回图像。例如一个画图工具：执行时生成图，返回一块说明文字，再加一块 `type: 'image'` 的内容，里面是 PNG 的 base64 和 MIME 类型。完整示例见[原文这一节](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/#toc_4)。

还缺的是工具结果的流式返回。想象一个 bash 工具，你希望 ANSI 序列一到就画出来。这目前做不到，但是个简单的修补，最终会进这个包。

工具调用流式输出时，边收边解析不完整的 JSON，对体验很关键。LLM 还在往外吐参数时，pi-ai 就逐步解析，调用结束前界面上就能看到部分结果。比如 Agent 在重写文件时，diff 可以一边生成一边显示。

#### 极简的 Agent 循环

最后，pi-ai 提供一个 [Agent 循环](https://github.com/badlogic/pi-mono/blob/main/packages/ai/src/agent/agent-loop.ts)，负责整段编排：处理用户消息，执行工具调用，把结果喂回 LLM，重复到模型给出不再调用工具的回复。循环还支持用回调排队消息：每一轮之后它询问有没有排队的消息，并在下一次助手回复之前注入。循环对所有事情都发事件，做响应式界面比较容易。

这个循环不让你指定最大步数，或其他统一 LLM API 里常见的旋钮。我从没找到使用场景，为什么要加？循环就一直转，直到 Agent 说它做完了。循环之上，[pi-agent-core](https://github.com/badlogic/pi-mono/tree/main/packages/agent) 提供一个 `Agent` 类，放真正用得上的东西：状态管理、简化的事件订阅、两种排队模式（一次一条，或一次全部）、附件处理（图像、文档），以及一层传输抽象，让你直接跑 Agent，或通过代理来跑。

我对 pi-ai 满意吗？大体满意。和任何统一 API 一样，抽象会渗漏，它不可能完美。但它已经用在七个不同的生产项目里，对我非常够用。

为什么自己做，而不用 Vercel AI SDK？[Armin 的博文](https://lucumr.pocoo.org/2025/11/21/agents-are-hard/) 和我的经历一致。直接建在各家 SDK 上，我能完全控制，API 可以按我想要的样子设计，表面积小得多。想看更展开的理由，去读 Armin 那篇。

### pi-tui

我是 DOS 时代长大的，终端用户界面就是我看着长大的东西。从 Doom 那些花哨的安装程序到 Borland 的产品，TUI（终端用户界面）陪我到九十年代末。等到终于换上图形界面的操作系统，我高兴坏了。TUI 大多可移植，也容易做成流式输出，但信息密度很差。话虽如此，我觉得 Pi 先做终端界面最说得通。哪天觉得需要，再扣上一层图形界面。

为什么自己写 TUI 框架？我看过别的选择，比如 [Ink](https://github.com/vadimdemedes/ink)、[Blessed](https://github.com/chjj/blessed)、[OpenTUI](https://github.com/sst/opentui) 等等。它们各自大概都挺好，但我肯定不想把 TUI 写成一个 React 应用。Blessed 看起来基本没人维护，OpenTUI 明确说还没到生产可用。另外，在 Node.js 上自己写一个 TUI 框架，像是个有意思的小挑战。

#### 两种 TUI

写终端界面本身不是高深学问。你只是得选一种毒药。基本上有两条路。

一条是把终端视口接过来。视口就是终端内容里你实际看得见的那一块，把它当成像素缓冲。这里没有像素，只有单元格：字符，加上背景色、前景色，以及斜体、粗体这类样式。我把这种叫全屏 TUI。Amp 和 opencode 走这条路。

代价是你失去回滚缓冲（scrollback），搜索得自己做。滚动也没了，得在视口里自己模拟。实现不难，但等于把终端模拟器已经提供的功能重做一遍。这种 TUI 里，鼠标滚动尤其总觉得不对劲。

另一条路是像普通命令行程序那样往终端里写，把内容追加进回滚缓冲，只是偶尔把「渲染光标」在可见视口里往上挪一点，重画转圈动画或文本框。没那么简单，但你懂这意思。Claude Code、Codex 和 Droid 就是这样做的。

编码 Agent 有个好性质：它们基本上是聊天界面。用户写提示，接着是 Agent 的回复、工具调用和结果。一切都是线性的，很适合用「原生」终端模拟器。你能用上它自带的自然滚动，以及在回滚缓冲里搜索。这也在一定程度上限制了 TUI 能做什么。我觉得这种限制挺可爱：约束会逼出只做该做的事、没有多余装饰的小程序。pi-tui 选的是这个方向。

#### 保留模式界面

做过图形界面编程的人，大概听过 retained mode（保留模式）和 immediate mode（立即模式）。保留模式里，你建一棵跨帧还在的组件树。每个组件知道怎么渲染自己，没变化就可以缓存输出。立即模式里，每一帧都从头重画（实际上立即模式界面也会缓存，不然会散架）。

pi-tui 用一种简单的保留模式。一个 `Component` 就是一个对象：`render(width)` 返回字符串数组（水平方向塞得进视口的行，颜色和样式用 ANSI 转义码），可选的 `handleInput(data)` 处理键盘。`Container` 垂直排一组组件，收集它们渲染出的所有行。`TUI` 类自己就是一个容器，负责把一切编排起来。

TUI 要更新屏幕时，就让每个组件渲染。组件可以缓存输出：一条已经流完的助手消息，不必每次都重新解析 Markdown、重新生成 ANSI 序列，把缓存的行返回去就行。容器收集所有子组件的行。TUI 把这些行收齐，和上一棵组件树渲染过的行比较。它留着某种后缓冲，记住已经写进回滚缓冲的内容。

然后它只重画变了的部分。我把这个办法叫差分渲染。我很不擅长起名字，这东西大概有个正式名称。

#### 差分渲染

原文在这一节嵌了一段可交互演示，用来看每次更新到底重画了哪些行。[演示见原文](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/#toc_9)。

算法很简单：

1. **第一次渲染**：把所有行输出到终端。
2. **宽度变了**：整屏清掉，全部重画（软换行变了）。
3. **普通更新**：找到和屏幕上第一行不一样的那一行，把光标移过去，从那里重画到末尾。

有一个坑：如果第一行变化发生在可见视口之上（用户往上滚了），就得整屏清掉再重画。终端不让你往视口上方的回滚缓冲里写。

为了更新时不闪，pi-tui 把整个渲染包在同步输出的转义序列里（`CSI ?2026h` 和 `CSI ?2026l`）。这是告诉终端先把输出缓冲起来，再一次显示。多数现代终端支持这个。

效果如何，闪得厉害吗？在 Ghostty 或 iTerm2 这种够用的终端里，这套办法非常好，你看不到闪烁。在没那么幸运的实现里，比如 VS Code 自带的终端，会闪一点，取决于几点钟、显示器大小、窗口大小等等。我已经很习惯 Claude Code，就没再花时间优化这个。VS Code 里那一点闪烁我可以接受。否则我反而不像在家里。而且它闪得仍然比 Claude Code 少。

这种做法浪费吗？我们存下整整一份回滚缓冲那么多的、先前渲染过的行，而且每次 TUI 被要求渲染自己时都要重画这些行。上面说的缓存减轻了这件事，所以重画不是大问题。我们仍然得把很多行互相比较。现实一点说，在不到 25 岁的电脑上，这无论性能还是内存都不是大事（很长的会话也就几百 KB）。谢谢 V8。换回来的是一个笨得不能再笨的编程模型，让我能很快迭代。

### pi-coding-agent

coding agent harness 该有哪些功能，我不需要解释。别的工具里你用惯的那些便利，Pi 大多都有：

- 跑在 Windows、Linux 和 macOS 上（或者说，任何有 Node.js 运行时和终端的地方）
- 多家提供方，会话中途可以换模型
- 会话管理：继续、恢复、分支
- 项目上下文文件（`AGENTS.md`），从全局到项目逐层加载
- 常用操作的斜杠命令
- 自定义斜杠命令，写成带参数的 Markdown 模板
- 用 OAuth 登录 Claude Pro / Max 订阅
- 用 JSON 配置自定义模型和提供方
- 主题可以改，并且能热重载
- 编辑器支持模糊搜文件、路径补全、拖放和多行粘贴
- Agent 干活时可以排队消息
- 有视觉能力的模型可以看图
- 会话可以导出 HTML
- 无界面运行：JSON 流和 RPC 模式
- 完整的费用和 token 统计

想看完整说明，读 [README](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/README.md)。更有意思的是，Pi 在理念和实现上跟其他 harness 岔开的地方。

#### 极简系统提示

系统提示就是下面这些。这是中文译文，英文措辞见[原文这一节](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/#toc_11)。

```text
你是一名专家级编程助手。你通过读文件、执行命令、编辑代码、写新文件，帮用户完成编程任务。

可用工具：
- read：读取文件内容
- bash：执行 bash 命令
- edit：对文件做精确的小改动
- write：创建或覆盖文件

准则：
- 文件操作（如 ls、grep、find）用 bash
- 编辑前先用 read 查看文件
- 精确修改用 edit（旧文本必须完全匹配）
- 只有新文件或整文件重写才用 write
- 总结自己做了什么时，直接输出纯文本，不要用 cat 或 bash 把做过的事再打印一遍
- 回复保持简短
- 处理文件时把路径写清楚

文档：
- 你自己的文档（包括自定义模型设置和主题制作）在：/path/to/README.md
- 用户问功能、配置或安装时去读它；如果用户要你加自定义模型或提供方，或做一套自定义主题，尤其要读。
```

就这些。底下唯一会注入的，是你的 `AGENTS.md`：一份对所有会话生效的全局文件，加上放在项目目录里的那份。你想怎么定制 Pi，就写在这里。你甚至可以换掉整段系统提示。对比一下就知道差距，比如 [Claude Code 的系统提示](https://cchistory.mariozechner.at)、[Codex 的系统提示](https://github.com/openai/codex/blob/main/codex-rs/core/prompt.md)，或 [opencode 按模型分的提示](https://github.com/sst/opencode/tree/dev/packages/opencode/src/session/prompt)。其中 Claude 那份，是他们抄来的 [Claude Code 原提示](https://github.com/sst/opencode/blob/dev/packages/opencode/src/session/prompt/anthropic-20250930.txt) 的[删节版](https://github.com/sst/opencode/blob/dev/packages/opencode/src/session/prompt/anthropic.txt)。

你可能觉得这很疯。模型多半在各自原生的编码 harness 上受过训练，所以用原生系统提示，或者像 opencode 那样贴近原生的提示，按理最理想。但事实是，前沿模型都已经用强化学习训得足够充分，它们本来就懂 coding agent 是什么。看起来并不需要一万 token 的系统提示。后面的评测一节会看到这一点，我过去几周只用 Pi，体感也是这样。Amp 虽然抄了一部分原生系统提示，用他们自己的提示似乎也过得去。

#### 极简工具集

工具定义如下，描述按原文译成中文，参数名保留。英文原文见[这一节](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/#toc_12)。

```text
read
  读取文件内容。支持文本和图像（jpg、png、gif、webp）。
  图像作为附件发送。文本文件默认读前 2000 行。大文件用 offset / limit。
  - path：要读的文件路径（相对或绝对）
  - offset：从第几行开始读（从 1 计）
  - limit：最多读多少行

write
  把内容写进文件。不存在就创建，存在就覆盖。自动创建父目录。
  - path：要写的文件路径（相对或绝对）
  - content：要写入的内容

edit
  用精确文本替换来编辑文件。oldText 必须完全匹配（包括空白）。
  用来做精确、小范围的修改。
  - path：要编辑的文件路径（相对或绝对）
  - oldText：要找到并替换的精确文本（必须完全匹配）
  - newText：用来替换旧文本的新文本

bash
  在当前工作目录执行一条 bash 命令。返回 stdout 和 stderr。
  可选：用秒为单位给一个超时。
  - command：要执行的 bash 命令
  - timeout：超时秒数（可选，默认没有超时）
```

另外还有只读工具（grep、find、ls），用来限制 Agent，不让它改文件或跑任意命令。默认关掉，所以 Agent 只拿到上面四个工具。

事实表明，一个有效的 coding agent 只要这四个工具。模型知道怎么用 bash，也在输入 schema 相近的 read、write、edit 上受过训练。对比 [Claude Code 的工具定义](https://cchistory.mariozechner.at) 或 [opencode 的工具定义](https://github.com/sst/opencode/tree/dev/packages/opencode/src/tool)（明显从 Claude Code 派生：同样的结构、同样的例子、同样的 git 提交流程）。值得一提的是，[Codex 的工具定义](https://github.com/openai/codex/blob/main/codex-rs/core/src/tools/spec.rs) 和 Pi 一样偏少。

Pi 的系统提示加上工具定义，合计低于 1000 token。

#### 默认就是 YOLO

Pi 跑在完全的 YOLO mode（默认不拦权限）里，并假设你知道自己在干什么。它可以不受限制地访问你的文件系统，执行任何命令，没有权限检查，也没有安全护栏。文件操作和命令都不会弹权限确认。没有[用 Haiku 预先检查 bash 命令](https://mariozechner.at/posts/2025-08-03-cchistory/#haiku-this-haiku-that)是不是恶意内容。整个文件系统都能碰。可以用你的用户权限执行任何命令。

看别的编码 Agent 里的安全措施，大多是安全表演。只要 Agent 能写代码并且能跑代码，就基本上没戏了。要阻止数据外传，唯一的办法是掐掉 Agent 所在执行环境的全部网络，而那样 Agent 也基本没用了。另一种办法是给域名做白名单，但这也能用别的手段绕过去。

Simon Willison [写过很多](https://simonwillison.net/2023/Apr/25/dual-llm-pattern/)这个问题。他的「双 LLM」模式试图对付困惑的代理（confused deputy）攻击和数据外传，但他自己也承认「这办法挺糟」，而且实现复杂度巨大。核心问题还在：如果一个 LLM 能用的工具既能读私有数据，又能发网络请求，你就是在跟攻击面打地鼠。

既然我们解不开这三件套（读数据、执行代码、访问网络），Pi 就干脆认了。大家为了真能干活，反正都在 YOLO mode 里跑，为什么不把它做成默认，而且是唯一选项？

默认情况下，Pi 没有网页搜索或抓取工具。但它可以用 `curl`，也可以读磁盘上的文件，这两样都给提示注入（prompt injection）留了足够大的表面。文件里或命令输出里的恶意内容可以影响行为。如果你接受不了完全开放的访问，就把 Pi 放进容器里跑；如果你需要那种看上去像护栏的东西，就换一个工具。

#### 不内建待办

Pi 现在不支持、以后也不会支持内建待办。以我的经验，待办清单通常把模型搞糊涂的时候，多过帮上忙的时候。它们增加一份模型必须自己跟踪和更新的状态，于是多了出错的机会。

如果需要跟踪任务，就把它做成外部状态，写进文件：

```markdown
# TODO.md

- [x] 实现用户认证
- [x] 加上数据库迁移
- [ ] 写 API 文档
- [ ] 加上限流
```

Agent 可以按需要读写这个文件。用复选框记下哪些做完了、哪些还没做。简单、看得见，而且在你的控制之下。

#### 没有计划模式

Pi 现在没有、以后也不会有内建的 plan mode。让 Agent 和你一起把问题想清楚，不去改文件、也不执行命令，通常就够了。

如果计划要跨会话留下来，就写进文件：

```markdown
# PLAN.md

## 目标
重构认证系统，使其支持 OAuth

## 做法
1. 调研 OAuth 2.0 的流程
2. 设计 token 的存储结构
3. 实现授权服务器的端点
4. 更新客户端的登录流程
5. 补测试

## 当前步骤
正在做第 3 步：授权端点
```

Agent 干活时可以读这份计划、更新它、引用它。那种只活在一次会话里的临时计划模式，做不到这件事。放在文件里的计划可以跨会话共用，也可以跟代码一起做版本管理。

有意思的是，Claude Code 现在有一个 [Plan Mode](https://code.claude.com/docs/en/common-workflows#use-plan-mode-for-safe-code-analysis)，本质上是只读分析，最后还是会把一份 Markdown 写到磁盘上。而且你基本上没法在不批准一大堆命令的情况下使用计划模式，因为不批准的话，计划本身就做不成。

Pi 的差别是，我对一切都有可观察性。我能看到 Agent 实际看了哪些材料，又完全漏了哪些。在 Claude Code 里，负责编排的那个 Claude 实例通常会拉起一个子 Agent，而那个子 Agent 做了什么，你完全看不见。我能马上看到那份 Markdown。我可以和 Agent 一起改它。简而言之，做计划我需要可观察性，Claude Code 的计划模式给不了我。

如果你在做计划时一定要限制 Agent，可以用命令行指定它能用哪些工具：

```bash
pi --tools read,grep,find,ls
```

这给你一个只读模式，用来探索和做计划，Agent 不能改任何东西，也不能跑 bash。不过你用了也不会开心。

#### 不支持 MCP

Pi 现在不支持、以后也不会支持 MCP。我[另外写过很长一篇](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/)，短说就是：对大多数用途，MCP 服务器是杀鸡用牛刀，而且上下文开销很大。

常见的 MCP 服务器，比如 Playwright MCP（21 个工具，13.7k token）或 Chrome DevTools MCP（26 个工具，18k token），每次会话都把全部工具描述倒进上下文。你还没开始干活，上下文窗口的 7% 到 9% 就没了。这些工具里，有很多在某一次会话中你根本不会用。

替代办法很简单：做带 README 的命令行工具。Agent 需要这个工具时才去读 README，只在必要时付 token 成本（渐进披露，progressive disclosure），再用 bash 去调用。这种做法可以组合（把输出接起来、把命令串起来），容易扩展（再加一个脚本就行），也省 token。

我就是这样给 Pi 加网页搜索的。原文这一节有一段演示。[演示见原文](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/#toc_16)。

这些工具我收在 [github.com/badlogic/agent-tools](https://github.com/badlogic/agent-tools)。每个工具都是一个简单的命令行，配一份 README，Agent 按需去读。

如果你无论如何要用 MCP 服务器，可以看看 [Peter Steinberger](https://x.com/steipete) 的 [mcporter](https://github.com/steipete/mcporter)：它把 MCP 服务器包成命令行工具。

#### 没有后台 bash

Pi 的 bash 工具同步执行命令。没有内建办法去启动一个开发服务器、在后台跑测试，或在命令还在跑的时候跟一个 REPL 交互。

这是故意的。后台进程管理会增加复杂度：你得跟踪进程、缓冲输出、退出时清理，还得有办法给正在跑的进程送输入。Claude Code 用他们的后台 bash 功能处理了其中一部分，但可观察性很差（这是 Claude Code 的常见主题），而且逼着 Agent 自己记住哪些实例在跑，却不提供一个工具去查询它们。更早的 Claude Code 版本里，compaction（上下文压缩）之后，Agent 会忘掉所有后台进程，也没有办法查询，你只能手动杀掉。这一点后来修好了。

改用 [tmux](https://github.com/tmux/tmux)。原文这一节是 Pi 在 LLDB 里调试一个崩溃的 C 程序。[演示见原文](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/#toc_17)。

可观察性够不够？同样的办法也适用于长时间跑的开发服务器、盯着日志输出，以及类似场景。你要是想，还可以通过 tmux 跳进上面那个 LLDB 会话，和 Agent 一起调试。tmux 还有一个命令行参数，能列出所有活动会话。挺好。

后台 bash 就是没必要。你知道 Claude Code 也可以用 tmux。有 bash 就够了。

#### 没有子 Agent

Pi 没有专门的子 Agent 工具。Claude Code 要做复杂的事时，常常拉起一个子 Agent 去处理任务的一部分。那个子 Agent 做了什么，你完全看不见。这是黑盒里的黑盒。Agent 之间传递上下文也做得很差。负责编排的 Agent 决定一开始传给子 Agent 什么上下文，而你通常几乎控制不了。子 Agent 要是犯错，调试会很痛苦，因为你看不到完整对话。

如果你需要 Pi 把自己再拉起来，就让它用 bash 跑自己。你甚至可以让它在一个 tmux 会话里把自己拉起来，这样既完全看得见，也能直接跟那个子 Agent 交互。

[图见原文](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/#toc_18)（子 Agent 示意图）。

但更重要的是：把工作流改一改，至少把那些全是在搜集上下文的工作流改一改。人们在一次会话里用子 Agent，觉得这样能省上下文空间。这没错。但这么想子 Agent 是想错了。会话进行到一半才用子 Agent 去搜集上下文，说明你事先没计划。如果需要搜集上下文，先在它自己的会话里做完。做出一份产物，以后在一个新会话里用它，把 Agent 需要的上下文一次给够，又不用拿工具输出去污染上下文窗口。这份产物对下一个功能可能也有用。搜集上下文的时候，可观察性和可操纵性很重要，你也能得到它们。

因为跟流行的看法相反，模型在「实现一个新功能或修一个缺陷所需的上下文是否找全了」这件事上仍然很差。我把这归咎于训练方式：模型被训练成只读文件的一部分，而不是整个文件，所以它们不愿意把一切都读完。于是它们漏掉重要上下文，看不到要把任务做完所需要的东西。

看看 [pi-mono 的 issue](https://github.com/badlogic/pi-mono/issues) 和那些 pull request。很多被关掉或退回去改，是因为 Agent 没能完全抓住需要做什么。这不是贡献者的错。我真心感激他们，因为哪怕不完整的 PR 也能让我走得更快。这只说明我们太信任自己的 Agent 了。

我不是全盘否定子 Agent。有正当用途。我最常用的一种是代码审查：我让 Pi 用一段代码审查提示把自己再拉起来（通过自定义斜杠命令），然后拿到输出。

```markdown
---
description: 跑一个做代码审查的子 Agent
---
用 bash 把你自己再拉起一份，做代码审查：$@

使用 `pi --print`，参数按情况给。如果用户指定了模型，
就相应加上 `--provider` 和 `--model`。

交给子 Agent 的提示要求它审查这些方面：
- 缺陷和逻辑错误
- 安全问题
- 错误处理的缺口

你自己不要去读代码。让子 Agent 去读。

汇报子 Agent 的发现。
```

我用它来审查 GitHub 上的 pull request。原文有一段演示。[演示见原文](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/#toc_18)。

用一段简单的提示，我可以选择具体审什么、用哪个模型。我想的话还可以设思考档位。我也可以把完整的审查会话存成文件，再在另一个 Pi 会话里跳进去；或者声明这是一次临时会话，不写到磁盘。这些都会被翻译成一段提示，主 Agent 读完，再据此用 bash 把自己执行一遍。我看不到子 Agent 内部的全部过程，但看得到它的全部输出。别的 harness 其实不提供这个，这在我看来说不通。

当然，这有点像一个模拟出来的用例。现实里，我会直接新开一个 Pi 会话，让它审查那个 pull request，也许先拉到本地分支。看完它的初审，我加上自己的审查，然后一起做到它够好为止。我用不合并垃圾代码的工作流就是这个。

拉起多个子 Agent、并行实现不同功能，在我看来是一种反模式，也行不通。除非你不在乎代码库变成一堆垃圾。

### 评测

我上面说了不少大话。那些唱反调的说法，有没有数字证明它们真的成立？我有自己的日常体验，但博客里很难把体验搬过去，你只能选择信我。所以我给 Pi 配上 Claude Opus 4.5，做了一次 [Terminal-Bench 2.0](https://github.com/laude-institute/terminal-bench) 测试，让它去跟 Codex、Cursor、Windsurf 以及其他 coding harness 比，对方用的是各自的原生模型。我们都知道评测代表不了真实世界的表现，但这是我能给你的、最接近证据的东西，用来说明我上面说的并不全是胡扯。

我做了一次完整运行，每个 task（任务）五次 trial（一次运行），这样结果就有资格提交到排行榜。我还开了第二次运行，只在欧洲中部时间跑，因为我发现一旦太平洋时间那边上线，错误率就会变差，评测结果也跟着变差。第一次运行的结果见原文的图。[图见原文](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/#toc_19)。

截至 2025 年 12 月 2 日，Pi 在当时排行榜上的位置也在原文的图里。[图见原文](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/#toc_19)。

我提交给 Terminal-Bench 维护者、希望放进排行榜的是这份 [results.json](https://gist.github.com/badlogic/f45e8f6e481e5ab7d3a50659da84edaa)。Pi 的评测运行器在[这个仓库](https://github.com/badlogic/pi-terminal-bench)，想复现可以去看。我建议用你的 Claude 订阅，而不是按量付费。

只在欧洲中部时间跑的那一次，原文也放了一张进行中的图。[图见原文](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/#toc_19)。

那一次还要再跑一天左右。跑完我会更新这篇博文。

也注意排行榜上 [Terminus 2](https://github.com/laude-institute/terminal-bench/tree/main/terminal_bench/agents/terminus_2) 的名次。Terminus 2 是 Terminal-Bench 团队自己的极简 Agent，只给模型一个 tmux 会话。模型把命令当成文本发给 tmux，自己解析终端输出。没有花哨的工具，没有文件操作，就是跟终端裸聊。它在工具精致得多的 Agent 面前并不落下风，而且能配多种模型。这是又一条证据：极简做法可以做得一样好。

### 小结

评测分数很好玩，真正的证明还得看每天干活。我这边的情况是，Pi 表现得相当好。Twitter 上全是讲上下文工程的帖子和博客，但我觉得我们现有的 harness，没有一个真的让你去做上下文工程。Pi 是我给自己做的一件工具，让我尽可能自己掌舵。

我对 Pi 现在的位置相当满意。还有几样我想加，比如 [compaction](https://github.com/badlogic/pi-mono/issues/92) 或[工具结果的流式返回](https://github.com/badlogic/pi-mono/issues/44)，但我觉得自己再需要的不多了。缺 compaction 对我个人还不是问题。不知为什么，我和 Agent 之间[几百轮来回](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/media/long-session.html)可以塞进同一次会话。换成 Claude Code，不做 compaction 我做不到。

话虽如此，我欢迎贡献。但和我所有的开源项目一样，我倾向于独断。这是我这些年在更大的项目上付出代价才学到的。如果我关掉了你发来的 issue 或 PR，希望别往心里去。我也会尽量告诉你原因。我只是想让它保持聚焦、可维护。如果 Pi 不合你的需要，请你 fork。这是真心话。如果你做出的东西比我的更符合我的需要，我会高兴地加入。

我觉得上面有些经验也能搬到别的 harness 上。你试了怎么样，告诉我。

## 笔记 {#notes}

- 长文的日期是 2025-11-30。文末他自己还把 compaction 放在愿望清单上（issue 92）。[对照表](./pi-vs-claude-code)写的是 Pi v0.52.10、2026 年 2 月，里面已经有 compaction 相关事件和扩展。读两篇时以各自的日期为准，不要把后来的功能倒回这篇。
- 数字口径也不一样。这篇说系统提示加工具定义合计低于 1000 token。对照表把系统提示单独写成约 200 token。都是原文自己的数字，本页不另算。
- 和 [构建高效的 AI Agent](./building-effective-agents)：他默认你已经接受「路径没法事先写死，才让模型自己决定下一步」。他争的是 harness 该有多厚，不是 Agent 该不该存在。
- 和 [AI Agent 的有效上下文工程](./effective-context-engineering-for-ai-agents)：全文的轴就是「精确控制进上下文的东西」。极短系统提示、工具描述按需才读，对应那里的 JIT（即时加载）和注意力预算。他不用内建待办，是因为多出来的状态要占上下文，还容易跟丢。
- 和 [用 Agent Skills 装备 Agent](./agent-skills)：渐进披露是同一类想法。他的载体是命令行加 README，不是 `SKILL.md`，也不是 MCP。
- 和 [Model Context Protocol 介绍](./model-context-protocol)：他的立场是不内建 MCP，理由是工具描述会先吃掉上下文。这不是「MCP 这个协议不存在」。要用时，他指向 mcporter，把 MCP 包成 CLI。
- 和 [Claude Code 最佳实践](./claude-code-best-practices)、[用 Claude Agent SDK 构建 Agent](./claude-agent-sdk)：Claude Code 把计划、待办、子 Agent 和权限做进产品。SDK 那篇把循环收成 gather、act、verify。pi-ai 的循环更素：一直转到模型不再调工具，作者还故意不提供最大步数。
- 和 [长时运行应用的 Harness 设计](./harness-design-long-running-apps)：长任务不交给内建的后台 bash，而交给 tmux。状态留在终端会话里，不留在模型记忆里，和「状态留在模型外面」同向。他也承认更早的 Claude Code 在 compaction 之后会忘掉后台进程。
- 和 [拆解 AI Agent 评测](./demystifying-evals-for-ai-agents)：Terminal-Bench 这一节是 task、trial、harness 的一次具体用法。五个 trial 才能上榜，他自己也说分数代表不了日常。本页不抄图上的名次，避免和日后榜单不一致。分数、排行榜截图和只在欧洲中部时间跑的那张图，都回原文看。
- 安全一节是作者的判断：能写代码又能跑代码时，权限弹窗挡不住外传，所以他把不拦权限做成默认。他给出的退路是放进容器，或换一个有护栏的工具。这不是本站的安全建议。
- 不单建页，只在这里链出：
  - 产品页：[pi.dev](https://pi.dev/)
  - 仓库：[badlogic/pi-mono](https://github.com/badlogic/pi-mono)
  - 演讲：[YouTube](https://www.youtube.com/watch?v=Dli5slNaJu0)
  - 二次摘要：[ZenML LLMOps Database 上的 Pi 条目](https://www.zenml.io/llmops-database/building-pi-a-minimal-extensible-coding-agent-framework)（不是作者原文）

返回 [AI / Agent 阅读清单](./)。
