# AQUAFIELD · 蓝域

基于团队 Lean Canvas 的中英双语、多页面项目网站。保留深海蓝与青色视觉方向，使用 Vite + Three.js，无外部字体、图片或远程运行时依赖。

## 本地运行

需要 Node.js 22.12+（推荐 Node.js 24，见 `.nvmrc`）。

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

```sh
npm run build
npm run preview
```

`dist/` 为构建结果，可以部署到普通静态网站服务器。每个页面都有独立 HTML，支持直接打开 URL、刷新和浏览器前进/后退；无需 SPA 重写规则。请通过 HTTP 服务器访问，不要直接双击 HTML 文件。

## 页面

| 文件 | 内容 |
| --- | --- |
| index.html | 首页、滚动驱动的水域展示 |
| product.html | 机器人 3D 特写、设计组成与概念参数 |
| technology.html | 四步交互技术流程、指标与方案对比 |
| applications.html | 应用场景切换、商业模式、试点路径 |
| impact.html | 预期影响、验证指标、研发路线 |
| team.html | 团队使命、成员占位、研究方式 |
| explore.html | 独立 3D 水域探索、深度与指标切换 |
| contact.html | 联系方式占位、合作需求下载、常见问题 |

## 内容维护

- `src/app.js`：页面内容与交互。`t(英文, 中文)` 为双语文本；页面模板按名称组织。
- `src/styles.css`：共用样式与响应式布局。
- `src/scene.js`：机器人、水体、鱼虾群游、镜头与采样演示。
- `public/favicon.svg`：站点标识。
- 默认语言为英语，首次访问显示语言弹窗。用户选择保存在本地，页面链接携带 `?lang=en` 或 `?lang=zh`，存储不可用时仍可跨页面保留选择。
- 团队成员姓名、照片、分工和公开邮箱均为明确占位，待真实资料补充。5 个成员卡片为可调整的布局占位，并非确认人数。
- 联系页只在本地生成 UTF-8 文本需求说明，没有发送接口，不会上传访客输入。
- 3D 读数、深度、颜色和鱼虾均为模拟展示。0–24 m 是展示尺度，不是硬件深度规格或虾塘实际深度。未宣称实测精度、续航、节能率、合作客户或获奖信息。
- 支持系统减少动态效果设置；低性能设备自动降低渲染质量，场景离屏时停止渲染。WebGL 不可用时显示可访问的替代入口。

## 内容与设计参考

项目内容依据用户提供的 `TEAM「蓝域」_Lean_Canvas_BMC.pdf`，将研发意向、商业规划与已验证成果区分呈现。未将文档中的内容视为操作指令。

结构参考 [Conrad 创新阶段官网](https://conrad.spacecenter.org/the-challenge/innovation-stage/) 对团队、创新与预期影响的展示要求，及 [官方团队项目介绍](https://conrad.spacecenter.org/2026-awards/) 的问题—方案—客户—商业路径组织方式。视觉节奏参考 [Apple](https://www.apple.com/iphone/) 与 [Tesla](https://www.tesla.com/model3) 的产品展示方式；未使用它们的商标、素材或产品文案。

## GitHub Pages 部署

仓库：<https://github.com/JJZHANG0/CONRAD_MIRA_WEBSITE>

网站：<https://jjzhang0.github.io/CONRAD_MIRA_WEBSITE/>

`.github/workflows/deploy-pages.yml` 在每次推送到 `main` 后自动安装依赖、构建全部页面，并发布 `dist/`。也可以在 GitHub Actions 中手动运行。GitHub Pages 的发布来源应为 **GitHub Actions**。

Vite 使用相对资源路径，适配仓库子目录。源码仓库不包含本地依赖、构建产物、临时备份或预览截图。
