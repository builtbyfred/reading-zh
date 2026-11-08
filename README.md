# 阅读译库

中文阅读、译文与笔记。主题不限于 AI：Anthropic、OpenAI、X 上的长文，以及个人成长，都可以放在这里。

每篇文章链接到官方原文，站内只放我们写的中文导读、摘要或译文，并标明 **非官方译文**。不镜像、不粘贴第三方英文全文。原文版权归原权利人，见 [LICENSE](LICENSE)。

站点语言是简体中文。生成器是 [VitePress](https://vitepress.dev/) 1.6（当前稳定版）。

## 目录约定

VitePress 的根目录是 `docs/`。仓库根目录放 `README`、`LICENSE`、`CONTRIBUTING`，这些说明文件不会进站点导航。

```text
docs/                         站点源文件（VitePress root）
├── .vitepress/
│   ├── config.ts             导航、侧栏、中文界面
│   ├── ai-sidebar.ts         AI / Agent 侧栏条目
│   └── theme/                「非官方译文」提示条
├── index.md                  首页
├── ai-agents/                AI / Agent 书单与各篇占位
├── growth/                   自身成长
└── notes/                    短摘录 / 笔记
```

构建产物在 `docs/.vitepress/dist`，已被 `.gitignore` 忽略。

## 本地运行

需要 Node.js 18 或更高版本。

```bash
git clone https://github.com/builtbyfred/reading-zh.git
cd reading-zh
npm install
npm run dev
```

终端会打印本地地址，默认是 `http://localhost:5173`。

| 脚本 | 作用 |
| --- | --- |
| `npm run dev` | 本地开发。`npm run docs:dev` 与它相同 |
| `npm run build` | 构建静态站点。`npm run docs:build` 与它相同 |
| `npm run preview` | 预览构建结果。`npm run docs:preview` 与它相同 |

当前 AI / Agent 书单里，Anthropic 的 25 篇和 Pi 的两篇是完整译文。第九节社区与产业精选以摘要为主，其中一篇是全文译文。

## 部署

构建命令：`npm run build`  
输出目录：`docs/.vitepress/dist`（写在 `wrangler.jsonc` 的 `assets.directory`）

### Cloudflare Workers Builds

在 **Workers & Pages** 连接本仓库。Worker 名称用 `reading-zh`，须与 `wrangler.jsonc` 的 `name` 一致。

| 设置 | 值 |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy`（或 `npm exec wrangler deploy`） |
| Build output directory | 不填。路径在 `wrangler.jsonc` |
| Node.js | 22（本仓库的 Wrangler 4 要求 Node 22+） |

挂在域名根路径时，保持 `docs/.vitepress/config.ts` 里的 `base: '/'`。

### GitHub Pages

产物目录同样是 `docs/.vitepress/dist`。仓库里的 GitHub Actions（`.github/workflows/build.yml`）只在 push 和 pull request 上跑构建检查，不会自动发布。

若站点地址是项目页 `https://<user>.github.io/reading-zh/`，把 `base` 改成 `'/reading-zh/'` 再构建。用户页或自定义域名挂在根路径时保持 `'/'`。

## 参与贡献

新增文章、frontmatter 字段和术语表见 [CONTRIBUTING.md](CONTRIBUTING.md)。
