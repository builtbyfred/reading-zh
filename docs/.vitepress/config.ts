import { defineConfig } from 'vitepress'
import { aiAgentsSidebar } from './ai-sidebar'

export default defineConfig({
  lang: 'zh-CN',
  title: '阅读译库',
  description:
    '非官方中文阅读、译文与笔记。链接官方原文，不转载第三方英文全文。',
  titleTemplate: ':title · 阅读译库',
  base: '/',
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    externalLinks: {
      target: '_blank',
      rel: 'noopener noreferrer',
    },
    container: {
      tipLabel: '提示',
      warningLabel: '注意',
      dangerLabel: '警告',
      infoLabel: '说明',
      detailsLabel: '详情',
    },
  },
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: 'AI / Agent', link: '/ai-agents/', activeMatch: '/ai-agents/' },
      { text: '自身成长', link: '/growth/', activeMatch: '/growth/' },
      { text: '笔记', link: '/notes/', activeMatch: '/notes/' },
    ],
    sidebar: {
      '/ai-agents/': aiAgentsSidebar,
      '/growth/': [
        {
          text: '自身成长',
          items: [{ text: '概览', link: '/growth/' }],
        },
      ],
      '/notes/': [
        {
          text: '短摘录 / 笔记',
          items: [{ text: '概览', link: '/notes/' }],
        },
      ],
    },
    outline: {
      label: '本页大纲',
      level: [2, 3],
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },
    lastUpdated: {
      text: '最后更新于',
    },
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色',
    darkModeSwitchTitle: '切换到深色',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',
    skipToContentLabel: '跳到内容',
    externalLinkIcon: true,
    notFound: {
      code: '404',
      title: '找不到这篇笔记',
      quote: '链接可能写错了，或者这篇还没建。',
      linkLabel: '回到首页',
      linkText: '回到首页',
    },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索',
            buttonAriaLabel: '搜索',
          },
          modal: {
            displayDetails: '显示详情',
            resetButtonTitle: '清除查询',
            backButtonTitle: '关闭搜索',
            noResultsText: '没有结果',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },
    editLink: {
      pattern: 'https://github.com/builtbyfred/reading-zh/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/builtbyfred/reading-zh',
        ariaLabel: 'GitHub',
      },
    ],
    footer: {
      message: '非官方译文与笔记。第三方原文版权归原权利人。',
      copyright: 'MIT License © 2026 builtbyfred',
    },
  },
})
