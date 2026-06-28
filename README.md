# Phi.ts

A web-based **Phigros** emulator built with Next.js 16 + TypeScript.

**Phigros** is a rhythm game developed by Pigeon Games. This project is an unofficial web reimplementation of Phigros's gameplay, migrated from [phigros-html5](https://github.com/lchzh3473/phigros-html5) (MPL-2.0). It is not affiliated with or endorsed by Pigeon Games. All Phigros assets (music, illustrations, charts) belong to their respective owners — this project does not distribute any copyrighted game assets.

**Phigros** 是由 Pigeon Games 开发的音乐节奏游戏。本项目是 Phigros 玩法的**非官方网页复刻**，迁移自 [phigros-html5](https://github.com/lchzh3473/phigros-html5)（MPL-2.0）。本项目与 Pigeon Games 无任何隶属或 endorsement 关系。Phigros 的所有素材（音乐、曲绘、谱面）版权归原权利人所有——本项目不分发任何受版权保护的游戏素材。

## Features / 功能

- Full game flow: title → tap-to-start → chapter select → song select → play → result
- 完整游戏流程：标题 → 点击开始 → 章节选择 → 选歌 → 游玩 → 结算
- Chart formats: JSON (formatVersion 1/3/3473) and PEC
- 谱面格式：JSON（formatVersion 1/3/3473）与 PEC
- Custom chart upload via ZIP (music + illustration + chart + line textures)
- 通过 ZIP 上传自制谱面（音乐 + 曲绘 + 谱面 + 判定线贴图）
- Settings persistence (Zustand + localStorage)
- 设置持久化（Zustand + localStorage）
- Pause / resume with countdown blur transition
- 暂停 / 继续，带倒计时毛玻璃渐变
- About us page with auto-scrolling credits
- 关于我们页面，自动滚动 credits

## Tech Stack / 技术栈

- Next.js 16 (App Router, Turbopack)
- TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- Zustand (state management)
- JSZip (ZIP parsing)
- Canvas 2D rendering

## Getting Started / 快速开始

```bash
bun install
bun run dev    # development
bun run build  # production (static export to ./out)
```

Open `http://localhost:3000` in your browser.
在浏览器打开 `http://localhost:3000`。

## Project Structure / 项目结构

```
src/
  app/              # routes (page.tsx per route)
    chapter-select/
    song-select/
    while-playing/
    level-over/
    settings/
    about-us/
    tap-to-start/
  components/
    phigros/        # game components
      emulator/     # core emulator (script.phigros.emulator.ts)
  lib/
    phigros/        # asset paths, chart parser, custom-chart-storage
  hooks/
  styles/
    phigros.css     # all game styles
public/
  phigros/          # game assets (images, audio, charts, fonts)
```

## Custom Charts / 自制谱面

Click the "自定义 ZIP 上传" card on the chapter select page. Upload a ZIP containing:
在章节选择页点击"自定义 ZIP 上传"卡片，上传包含以下文件的 ZIP：

- Chart file: `.json` or `.pec` (required)
- 谱面文件：`.json` 或 `.pec`（必需）
- Music: `.mp3` / `.ogg` / `.wav`
- 音乐：`.mp3` / `.ogg` / `.wav`
- Illustration: `.png` / `.jpg`
- 曲绘：`.png` / `.jpg`
- `meta.json` (optional: name, artist, chartDesigner, illustrator)
- `meta.json`（可选：name、artist、chartDesigner、illustrator）
- `line.json` + texture images (optional: judgment line textures)
- `line.json` + 贴图图片（可选：判定线贴图）

## Acknowledgements / 致谢

- [phigros-html5](https://github.com/lchzh3473/phigros-html5) by lchzh3473 & HanHan233 — original web emulator (MPL-2.0)
- [sim-phi](https://github.com/lchzh3473/sim-phi) by lchzh3473 — reference implementation
- [Phigros](https://www.pigeongames.cn/) by Pigeon Games — the original game

## License / 许可证

This project is licensed under the **Mozilla Public License 2.0 (MPL-2.0)**.

本项目基于 **Mozilla Public License 2.0 (MPL-2.0)** 许可证。

The core emulator code (`src/components/phigros/emulator/`) is derived from phigros-html5 and is licensed under MPL-2.0. Files in that directory retain their original license header.

核心模拟器代码（`src/components/phigros/emulator/`）源自 phigros-html5，采用 MPL-2.0 许可证。该目录下的文件保留原始许可证声明。

MPL-2.0 requires that any modifications to MPL-licensed files must be made available under the same license. New files added by this project are also licensed under MPL-2.0.

MPL-2.0 要求对 MPL 许可文件的任何修改必须以相同许可证开源。本项目新增文件同样采用 MPL-2.0 许可证。

```
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.
```
