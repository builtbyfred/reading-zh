# 贡献指南

本仓库收录中文导读、摘要、译文和短笔记。主题不限于 AI。

Anthropic、OpenAI 或其他第三方的原文全文留在官方站点。每篇链接到官方 URL，正文是我们自己的中文。页面会在设置了 `source_url` 时自动标上「非官方译文」。

## 添加一篇文章

1. 选目录：
   - AI、Agent、模型与工程：`docs/ai-agents/<slug>.md`
   - 习惯、写作、决策、职业、作品：`docs/growth/<slug>.md`
   - 只讲一个点的摘录或卡片：`docs/notes/<slug>.md`
2. 文件名用英文 kebab-case，尽量沿用原文 URL 末段，例如 `building-effective-agents.md`。
3. 写 frontmatter 和正文。
4. 在该目录的 `index.md` 加上条目：本站链接、原文链接、一两句为什么读。
5. 登记侧栏：
   - AI / Agent 改 `docs/.vitepress/ai-sidebar.ts`
   - 自身成长、笔记改 `docs/.vitepress/config.ts`
6. 新开一个大类时，再增加目录、`index.md`、导航和侧栏。只有一篇时，放进现有目录即可。
7. 本地执行 `npm run build`，确认没有死链。

## Frontmatter

文章页至少写这些字段。日期只在核对过原文时填写，不确定就省略。

```yaml
---
title: 构建高效的 AI Agent
title_en: Building Effective AI Agents
description: 一句话说明这篇笔记讲什么，用于搜索和浏览器标题。
source: Anthropic
source_url: https://www.anthropic.com/engineering/building-effective-agents
date: 2024-12-19
status: 待译
tags:
  - Agent
---
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 中文标题，和正文里的一级标题一致 |
| `title_en` | 有官方英文标题时填写 | 只作对照，不代替中文标题 |
| `description` | 建议填 | 一句话，给搜索结果和 `<meta>` |
| `source` | 是 | 来源机构或作者，例如 `Anthropic` |
| `source_url` | 是 | 官方原文的 https 链接。有这个字段，页顶才会出现「非官方译文」 |
| `date` | 否 | 原文发表日期，`YYYY-MM-DD`。只在核对过时填写 |
| `status` | 是 | `待译`、`摘要`、`译文` 三者之一 |
| `tags` | 否 | 短标签，方便以后检索 |

`status` 的含义：

- `待译`：只有导读，还没有覆盖原文的摘要或译文
- `摘要`：有按原文结构整理的中文摘要
- `译文`：有完整中文译文

从「待译」改成「摘要」或「译文」时，保留导读和原文链接。提示条会跟着 frontmatter 更新。

## 正文

建议保持这几节，方便以后的人接着写：

```markdown
# 中文标题

**非官方译文。** 官方原文：[English Title](https://example.com)（来源 · 栏目）。

## 导读

用几句话说明这篇解决什么问题、适合谁读。

## 译文 / 摘要

按原文小节组织。引用原文句子时尽量短，并链回原文。

## 笔记

读的时候留下的例子、反例、和前后文的关系。
```

在 GitHub 上直接读 Markdown 的人看不到站点提示条，所以正文开头仍要写明非官方，并给出原文链接。

正文里写这些：

- 你自己的导读、摘要、译文、例子和反对意见
- 术语的中英对照
- 指向本站其他笔记的链接

正文边界：

- 第三方原文全文留在源站。折叠块和代码块里同样不放原文
- 引文保持很短，并链回原文
- `date` 只写核对过的发表日期

## 术语表

同一概念在全站用同一写法。专名保留原文：Claude、MCP、SWE-Bench、Clio、Cursor。一个词在文中第一次出现时，用「英文（中文括注）」或「中文（英文）」；后文可以只留一边，同一篇里保持一致。

| 术语 | 本站写法 |
| --- | --- |
| Agent | Agent。需要解释时写「Agent（能自己决定下一步的模型程序）」。与网络代理无关 |
| Workflow | 工作流。步骤可以事先写定，用来和 Agent 对照 |
| harness | harness（任务脚手架）。包住模型、负责跑任务或评测的那一层 |
| compaction | compaction（上下文压缩）。把变长上下文压短，留下后面还要用的信息 |
| context engineering | 上下文工程。决定整个上下文窗口里放什么、何时放 |
| prompt engineering | 提示词工程 |
| MCP | MCP（Model Context Protocol，模型上下文协议） |
| Skill | Skill。指 `SKILL.md` 这类按需展开的技能说明 |
| task / trial / grader | 首次出现写 task（任务）、trial（一次运行）、grader（评分器） |
| Orchestrator–worker | 编排者–工作者。多 Agent 里负责分活和负责执行的两侧 |
| sandbox | 沙箱 |
| session | 会话 |
| RLAIF | RLAIF（用 AI 反馈做的强化学习） |
| prompt caching | 提示缓存 |
| JIT | JIT（即时加载，just-in-time）。用到时再放进上下文 |
| loop engineering | loop engineering（循环工程）。设计会自己去发现工作、调用 Agent、把进度写在对话外的那一层 |
| worktree | worktree（隔离工作区）。同一 Git 仓库上的另一份工作目录，用来让并行改动互不覆盖 |

表里没有的词，选一个写法用在文里，并在 Pull Request 里补一行到这张表。

## 本地检查

```bash
npm install
npm run dev      # 看导航、侧栏和这篇新页面
npm run build    # 提交前跑一遍，死链会使构建失败
```

`npm run docs:dev`、`npm run docs:build` 分别与 `dev`、`build` 相同。
