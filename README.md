Phi.ts
======

一个使用 TypeScript 构建的节奏游戏，基于 Next.js 16，仿制 Phigros 的玩法机制。

Phi.ts 是独立项目，未参考、未逆向《Phigros》商业游戏的任何源代码，仅仿制其公开的玩法机制。核心模拟器模块源自开源项目 phigros-html5 (MPL-2.0)。

非商业、永久免费、开源。

项目地址: https://github.com/Kiruvex/Phi.ts

许可证
------

- 主项目: Apache License 2.0 (见 LICENSE)
- 模拟器模块 (src/components/phigros/emulator/): Mozilla Public License 2.0 (见 src/components/phigros/emulator/LICENSE)

技术栈
------

- Next.js 16 (App Router, 静态导出)
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui 组件库
- Zustand 状态管理
- framer-motion 动画

功能
----

- 9 个页面: 首页 / 点击开始 / 章节选择 / 歌曲选择 / 游玩 / 结算 / 设置 / 关于
- 3 首内置谱面 (支持 JSON 和 PEC 格式)
- 完整节奏游戏引擎: 音符判定 / 计分 / 连击 / 评级
- 游玩中暂停 / 继续 / 重试
- 自动游玩模式 (Autoplay)
- PWA 支持 (Service Worker 离线缓存)
- 设置持久化 (localStorage)
- 响应式设计
- 全局按钮音效
- 页面切换过渡动画
- 难度选择器滑块动画
- 设置页下落音符装饰动画

部署
----

静态导出模式，构建后生成 out/ 目录，可部署到任何静态托管平台。

构建:

    bun install
    bun run build

构建产物在 out/ 目录，包含所有静态 HTML/CSS/JS/资源。

Cloudflare Pages 部署:
- 构建命令: bun run build
- 输出目录: out

Vercel / Netlify / GitHub Pages 同理，指向 out/ 目录即可。

Service Worker 和 PWA 在任何域名下自动生效 (pages.dev / 自定义域名 / localhost)。

致谢
----

- phigros-html5 (MPL-2.0) by lchzh3473 和 HanHan233 - 模拟器参考
- Phigros by Pigeon Games - 玩法灵感
- oggmented - OGG 音频解码 (Safari 兼容)
- StackBlur - 高斯模糊

自定义歌曲 (计划中)
-------------------

参考 sim-phi (github.com/lchzh3473/sim-phi) 的实现方式，未来可支持:

1. 用户上传 ZIP 谱面包 (包含 meta.json / 谱面文件 / 曲绘 / 音乐)
2. 使用 jszip 解压，自动识别文件类型 (谱面/音频/图片)
3. 解析谱面 (JSON formatVersion 1/3/3473 或 PEC 格式)
4. 加载到模拟器游玩

sim-phi 的核心流程:
- FileEmitter: 创建 <input type="file"> 接受文件/文件夹上传
- ZipReader: 用 Web Worker 解压 ZIP，逐文件交给 reader 处理
- reader: 按文件扩展名自动分类 (.json/.pec=谱面, .mp3/.ogg=音频, .png/.jpg=图片)
- structChart: 解析谱面为统一内部格式
- 加载完成后填充下拉菜单，用户选择谱面/音乐/图片后点击播放

免责声明
--------

Phi.ts 是非商业粉丝项目。"Phigros" 是 Pigeon Games 的商标。本项目与 Pigeon Games 无关，也未获得其认可。所有音乐和谱面版权归各自创作者所有。
