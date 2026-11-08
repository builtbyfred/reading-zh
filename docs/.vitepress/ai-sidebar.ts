import type { DefaultTheme } from 'vitepress'

/** AI / Agent 侧栏。新增文章时在这里登记，并更新 docs/ai-agents/index.md。 */
export const aiAgentsSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: 'AI / Agent',
    items: [
      { text: '阅读清单', link: '/ai-agents/' },
      {
        text: '核心必读',
        collapsed: false,
        items: [
          { text: '1. 构建高效的 AI Agent', link: '/ai-agents/building-effective-agents' },
          { text: '2. AI Agent 的有效上下文工程', link: '/ai-agents/effective-context-engineering-for-ai-agents' },
          { text: '3. Model Context Protocol 介绍', link: '/ai-agents/model-context-protocol' },
          { text: '4. 为 AI Agent 编写有效工具', link: '/ai-agents/writing-tools-for-agents' },
          { text: '5. 用代码执行调用 MCP', link: '/ai-agents/code-execution-with-mcp' },
          { text: '6. 用 Agent Skills 装备 Agent', link: '/ai-agents/agent-skills' },
          { text: '7. 用 Claude Agent SDK 构建 Agent', link: '/ai-agents/claude-agent-sdk' },
          { text: '8. Claude Code 最佳实践', link: '/ai-agents/claude-code-best-practices' },
        ],
      },
      {
        text: '工具与协议',
        collapsed: true,
        items: [
          { text: '进阶工具使用', link: '/ai-agents/advanced-tool-use' },
          { text: '进阶工具使用（研究版）', link: '/ai-agents/advanced-tool-use-research' },
          { text: '用代码执行调用 MCP（研究版）', link: '/ai-agents/code-execution-with-mcp-research' },
        ],
      },
      {
        text: '评测与长期运行',
        collapsed: true,
        items: [
          { text: '拆解 AI Agent 评测', link: '/ai-agents/demystifying-evals-for-ai-agents' },
          { text: '长时运行应用的 Harness 设计', link: '/ai-agents/harness-design-long-running-apps' },
          { text: '扩展托管 Agent', link: '/ai-agents/managed-agents' },
          { text: '我们如何构建多 Agent 研究系统', link: '/ai-agents/multi-agent-research-system' },
          { text: 'Claude 与 SWE-Bench', link: '/ai-agents/swe-bench-sonnet' },
          { text: 'Claude Code 质量复盘', link: '/ai-agents/claude-code-quality-postmortem' },
        ],
      },
      {
        text: '开源 Harness：Pi',
        collapsed: false,
        items: [
          { text: '做一个有主见的极简编码 Agent', link: '/ai-agents/what-i-learned-building-pi-coding-agent' },
          { text: 'Claude Code 与 Pi Agent 功能对照', link: '/ai-agents/pi-vs-claude-code' },
        ],
      },
      {
        text: '检索与 Computer Use',
        collapsed: true,
        items: [
          { text: '上下文检索', link: '/ai-agents/contextual-retrieval' },
          { text: '开发 Computer Use 模型', link: '/ai-agents/developing-computer-use' },
        ],
      },
      {
        text: '对齐与安全',
        collapsed: true,
        items: [
          { text: '宪法式 AI', link: '/ai-agents/constitutional-ai' },
          { text: 'Claude 的宪法', link: '/ai-agents/claudes-constitution' },
        ],
      },
      {
        text: '行业与用法',
        collapsed: true,
        items: [
          { text: 'Anthropic 经济指数介绍', link: '/ai-agents/anthropic-economic-index' },
          { text: '经济指数：经济原语', link: '/ai-agents/economic-index-primitives' },
          { text: '经济指数：学习曲线', link: '/ai-agents/economic-index-learning-curves' },
          { text: 'Clio：隐私保护下的用法分析', link: '/ai-agents/clio' },
        ],
      },
      {
        text: '社区与产业精选',
        collapsed: true,
        items: [
          { text: '循环工程：让系统去提示 Agent', link: '/ai-agents/loop-engineering' },
          { text: '设计 MCP Gateway', link: '/ai-agents/uber-mcp-gateway' },
          { text: '编码 Agent 的 Harness 工程', link: '/ai-agents/harness-engineering-paper' },
          { text: '工程师要解的下一组问题', link: '/ai-agents/multiagent-new-problems' },
          { text: '模型作为内部人风险', link: '/ai-agents/models-as-insider-risks' },
          { text: 'HiTw93「你不知道的」系列', link: '/ai-agents/hitw93-ai-interview-series' },
          { text: '一个用寓言讲概念的提示', link: '/ai-agents/anthropic-god-prompt' },
          { text: '我怎么用 AI 编程 2026.08', link: '/ai-agents/how-i-use-ai-coding-2026-08' },
          { text: '你的编程 Agent 让你成了经理', link: '/ai-agents/your-coding-agents-made-you-a-manager' },
        ],
      },
    ],
  },
]
