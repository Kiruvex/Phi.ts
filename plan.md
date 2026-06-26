# Phi.ts — Phigros HTML5 → Next.js 迁移计划（混合架构，完全对齐）

> **项目命名**：本项目定名为 **Phi.ts**（φ 为 Phigros 满分评级符号，.ts 表 TypeScript），致敬原作但为独立项目。

> **版权与定位声明**（重要）：
> - **Phi.ts 与《Phigros》商业游戏（Pigeon Games 出品）无任何代码关系**——未参考、未逆向其任何一行代码，仅仿制其公开的玩法机制（节奏游戏下落式判定等，玩法机制不受版权保护）。
> - **Phi.ts 参考了开源项目 `phigros-html5`（MPL-2.0 协议）**——该项目本身是开源的，参考、引用、修改其代码完全合法。源自 phigros-html5 的文件保留 MPL-2.0 协议头与原作者（lchzh3473 & HanHan233）署名。
> - **Phi.ts 承诺非商业、永久免费、开源**——不做商业用途、不收费、不牟利。
> - **terrasphere 谱面因谱面作者授权问题，直接删除，不保留、不启用。**

> **目标**：参考开源项目 `phigros-html5`，将其全部 9 个页面、核心模拟器、PWA、Service Worker、谱面与资源完整迁移到现有 Next.js 16 + TypeScript + Tailwind + shadcn/ui 项目（项目名 **Phi.ts**），**功能、视觉、交互、性能、体验 1:1 对齐，不做任何删减、简化、改写或偷懒**。

> **架构选型（分两阶段演进）**：
> - **阶段一（当下，方案二·封装）**：外围 8 个页面用 Next.js App Router + React + shadcn/ui 重写；核心 `whilePlaying` 模拟器（2366 行 + 302 行）**原样封装为一个 client 组件**，仅做最小必要的模块化改造（去全局污染、接 React 生命周期），不重写判定/渲染/音频逻辑，以保留原版调好的性能与体验，尽快跑通全流程。
> - **阶段二（后期，方案一·重写）**：在阶段一稳定运行、性能与体验全部对齐之后，**用 TypeScript 从零重写模拟器**，彻底摆脱原版 JS 的全局变量污染与命令式风格，获得类型安全、可维护性、Tree-shaking 等工程化收益。重写以阶段一的封装版作为行为基准（逐函数对齐输入输出与时间戳），确保重写前后判定/分数/音画同步完全一致。详见 §11 后期演进。

---

## 0. 迁移原则与对齐标准（不可违背）

### 0.1 功能对齐
- 原版有的功能 **全部保留**，一个不少：9 个页面、谱面加载、判定、暂停/继续/重试、结算、设置、关于我们、PWA、A2HS、资源缓存、localStorage 成绩持久化。
- 原版没有的功能 **不擅自新增**（不擅自加用户系统、排行榜、在线对战等）。
- 原版的 Bug **全部修复**（用户已明确允许）。每处 bug 在 §7 已知问题清单中逐条标注：问题、位置、根因、修复方案、验收方式。修复以"让原版本应生效但失效的功能真正生效"为原则，不改变既有游戏机制与判定数值。

### 0.2 视觉对齐
- 全局 Phigros 视觉语言：`transform: skew(-15deg)` 倾斜切变 + 黑白配色 + 渐入动画，逐像素还原。
- 字体：保留 `Phigros` / `Mina` 字体族（Exo-Regular + Source Han Sans & Saira Hybrid-Regular）。
- 所有动画时长、缓动曲线、层级关系与原版一致。

### 0.3 交互对齐
- 触摸/鼠标/键盘多输入路径保留。
- 四角双击触发暂停/重试/全屏的隐藏交互保留。
- 倒计时 3-2-1、fadeIn 黑屏过渡、章节选择水平滚动、歌单垂直滚动等交互原样保留。

### 0.4 性能对齐
- 渲染循环稳定 60fps，不走 React 重渲染。
- 音频-画面同步误差 ≤ ±30ms。
- 判定窗口 1:1 还原（Perfect ±80ms / Good ±160ms，HyperMode ±120ms）。
- 输入事件直接绑到 Canvas，不走 React 合成事件。

### 0.5 数据对齐
- localStorage 键名、`phi` 成绩字符串编码格式（32 字符 md5 + 3 字符 acc base22 + 4 字符 score base32 + 1 字符 level base36，乱序拼接）**完全保留**，以便老用户数据兼容。
- URL 参数语义与格式不变（`play` / `l` / `c` / `score` / `mc` / `p` / `g` / `b` / `m` / `e`）。
- 谱面格式（JSON formatVersion 1/3/3473 + PEC）解析逻辑原样保留。

---

## 1. 原版项目全景速览（迁移基线）

### 1.1 页面与路由流程
```
[index] 介绍页 + A2HS + SW 注册
  → [tapToStart] 点击开始（音乐 + 粒子 + fadeIn）
    ├─ localStorage.length==0 → [settings]（首次）
    └─ 否则 → [chapterSelect]
              → [songSelect?c={chapter}]（切歌/切难度/切片预览音频）
                → [whilePlaying?play=...&l=...&c=...]（核心游玩）
                  ├─ 内嵌 iframe: loadingChartScreen
                  └─ 结束 → [LevelOver?play=...&l=...&score=...&mc=...&p=...&g=...&b=...&m=...&e=...&c=...]
                             ├─ retry → whilePlaying
                             └─ back → songSelect
[settings]（任意页面可进）→ back → chapterSelect / "关于我们" → aboutUs / "清除数据" → index
[aboutUs] tap-to-start 阶段 → 点击 → 滚动 credits → 回 chapterSelect
```

### 1.2 代码规模
| 模块 | JS 行数 | HTML 行数 | CSS 行数 |
|------|---------|-----------|----------|
| whilePlaying（核心） | 2,668 | 168 | 168 |
| songSelect | 320 | 49 | 456 |
| aboutUs | 57 | 2,086 | 139 |
| settings | 134 | 81 | 176 |
| LevelOver | 129 | 57 | 353 |
| chapterSelect | 33 | 57 | 168 |
| tapToStart | 43 | 24 | 92 |
| loadingChartScreen | （内联） | 57 | 194 |
| loadingScreen（孤儿） | 9 | 18 | 53 |
| index | 78 | 64 | — |
| **合计** | **~3,481** | **~2,661** | **~1,799** |

### 1.3 资源规模
- 78 张图片 / 30 个音频 / 20 个字体 / 7 个谱面文件 / 共 220 个文件（已排除 terrasphere 谱面包 4 个文件）
- 3 个外部库：oggmented-bundle.js、zip.min.js（CDN，死依赖将删除）、stackblur.min.js

### 1.4 关键技术细节（迁移时必须 1:1 还原）
- **AudioContext 初始化**：检测 OGG 支持，Safari 用 `oggmented.OggmentedAudioContext`。
- **mute.ogg 占位音频**：游戏开始时循环播放静音，不连接 destination，防止浏览器节流 AudioContext。
- **双 Canvas 结构**：可见 canvas + 离屏 canvasos（16:9 内部坐标系）。
- **时间模型**：`timeBgm = (now - curTimestamp)/1000 + curTime`，`timeChart = max(timeBgm - chart.offset - inputOffset/1000, 0)`。
- **判定类层级**：`Judgement` → `Judgements extends Array`，`addJudgement` + `judgeNote`。
- **stat 对象**：`noteRank[8]` / `combos[5]` / `scoreNum` / `accNum` / `rankStatus` / `lineStatus`。
- **phi localStorage**：40 字符段，乱序拼接，`getData(isAuto)` 返回 `[isNewRecord, scoreBestStr, delta, isAuto]`。
- **PEC 解析**（`chartp23`）：词法分析 + 指令系统（`bp`/`n1-n4`/`cv`/`ca`/`cf`/`cp`/`cm`/`cd`/`cr` + `#`/`&` 修饰符）+ motionType 缓动切片。
- **JSON 解析**（`chart123`）：v1→v3 升级（补 floorPosition、拆 start2/end2）。
- **谱面预处理**（`prerenderChart`）：加运行时字段、`arrangeSpeedEvent`/`arrangeLineEvent`、`addRealTime`、按 type 分桶排序、双押检测。
- **28 个缓动函数**（`tween` 数组，索引 2-29）。
- **Timer 类**：基于 `Date.now()` 的 play/pause/reset/addTime。

---

## 2. 目标架构总览

### 2.1 目录结构（在现有 Next.js 项目内）
```
/home/z/my-project/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # 改：注入 Phigros 字体、PWA manifest、全局 SW 注册
│   │   ├── page.tsx                      # 改：index 介绍页（A2HS + 缓存按钮 + 更新日志）
│   │   ├── tap-to-start/page.tsx         # 新
│   │   ├── chapter-select/page.tsx       # 新
│   │   ├── song-select/page.tsx          # 新
│   │   ├── while-playing/page.tsx        # 新（薄壳，挂载 PhigrosEmulator 组件）
│   │   ├── level-over/page.tsx           # 新
│   │   ├── settings/page.tsx             # 新
│   │   ├── about-us/page.tsx             # 新
│   │   └── api/
│   │       ├── charts/[chapter]/route.ts # 新：返回章节歌曲列表
│   │       ├── charts/[chapter]/meta/route.ts        # 新：返回某曲 meta.json
│   │       ├── charts/[chapter]/chart/route.ts       # 新：返回谱面文件
│   │       ├── charts/[chapter]/illustration/route.ts# 新：返回曲绘
│   │       ├── charts/[chapter]/music/route.ts       # 新：返回音乐
│   │       └── tips/route.ts             # 新：返回随机 tip
│   ├── components/
│   │   ├── phigros/
│   │   │   ├── PhigrosEmulator.tsx       # 新：核心模拟器 client 组件（封装 2366+302 行）
│   │   │   ├── emulator/
│   │   │   │   ├── script.phigros.emulator.ts  # 新：原版 JS 原样移植 + 最小改造
│   │   │   │   ├── index.ts                    # 新：原版 index.js 逻辑 + 最小改造
│   │   │   │   └── types.ts                    # 新：谱面/Note/Event/Stat 类型定义
│   │   │   ├── LoadingChartOverlay.tsx  # 新：替代原版 iframe 的加载遮罩
│   │   │   ├── ChapterCard.tsx          # 新
│   │   │   ├── SongItem.tsx             # 新
│   │   │   ├── SongList.tsx             # 新
│   │   │   ├── LevelChooser.tsx         # 新
│   │   │   ├── ScoreDisplay.tsx         # 新
│   │   │   ├── SettingSlider.tsx        # 新
│   │   │   ├── SettingToggle.tsx        # 新
│   │   │   └── SkewContainer.tsx        # 新：通用倾斜切变容器
│   │   └── ui/                          # 现有 shadcn/ui（复用）
│   ├── hooks/
│   │   ├── use-phigros-settings.ts      # 新：封装 11 个设置项的读写
│   │   ├── use-phigros-score.ts         # 新：封装 phi localStorage 读写
│   │   ├── use-auto-scale.ts            # 新：通用缩放（替代 autoScale.js）
│   │   ├── use-audio-context.ts         # 新：AudioContext 单例 + 用户手势 resume
│   │   └── use-pwa-install.ts           # 新：A2HS beforeinstallprompt
│   ├── lib/
│   │   ├── phigros/
│   │   │   ├── chart-parser.ts          # 新：chart123 + chartp23 纯函数版（供 songSelect 预览/校验用）
│   │   │   ├── score-codec.ts           # 新：phi 字符串编解码（40 字符段）
│   │   │   ├── constants.ts             # 新：gameLevels + 难度色 + URL 参数名
│   │   │   └── asset-paths.ts           # 新：资源路径常量
│   │   ├── db.ts                        # 现有
│   │   └── utils.ts                     # 现有
│   └── styles/
│       └── phigros.css                  # 新：全局 Phigros 样式（字体、skew 工具类、动画关键帧）
├── public/
│   ├── phigros/                         # 新：所有原版资源（保持原目录结构）
│   │   ├── whilePlaying/assets/         # 23 PNG + 4 OGG + 3 库 + clickRaw.png
│   │   ├── charts/                      # 3 个谱面包（sample/samplePec/ouroVoros）+ single.json（terrasphere 已删除）
│   │   ├── assets/fonts/                # 20 字体 + fonts.css
│   │   ├── assets/audio/                # Tap1-7.wav + LevelOver0-3.wav
│   │   ├── assets/images/               # 评级图 + UI + chapterImages + SVG
│   │   ├── assets/tips.json
│   │   ├── tapToStart/TouchToStart0.mp3
│   │   ├── chapterSelect/ChapterSelect0.mp3
│   │   ├── aboutUs/                     # AboutUs0/1.mp3 + snr.png
│   │   └── manifest.webmanifest
│   ├── sw.js                            # 新：Workbox 生成的 SW（或手写兼容原版策略）
│   └── logo.svg                         # 现有
├── plan.md                              # 本文件
└── phigros-html5/                       # 原版（保留作参考，迁移完成后可删）
```

### 2.2 路由映射
| 原版路径 | Next.js 路由 | 说明 |
|---------|-------------|------|
| `/index.html` | `/` | 介绍页 |
| `/tapToStart/index.html` | `/tap-to-start` | 点击开始 |
| `/chapterSelect/index.html` | `/chapter-select` | 章节选择 |
| `/songSelect/index.html?c=X` | `/song-select?c=X` | 歌曲选择 |
| `/whilePlaying/index.html?play=X&l=Y&c=Z` | `/while-playing?play=X&l=Y&c=Z` | 游玩（挂载模拟器） |
| `/LevelOver/index.html?...` | `/level-over?...` | 结算 |
| `/settings/index.html` | `/settings` | 设置 |
| `/aboutUs/index.html` | `/about-us` | 关于 |
| `/loadingChartScreen/index.html` | （合并为组件） | 不再独立路由，作为 whilePlaying 内的 overlay |
| `/loadingScreen/index.html` | （孤儿页，合并） | 逻辑合并到 LoadingChartOverlay |

### 2.3 资源路径策略
所有原版资源复制到 `public/phigros/` 下，**保持原相对目录结构**，这样：
- 模拟器内部 `../assets/...` 改为 `/phigros/assets/...`
- 模拟器内部 `../charts/...` 改为 `/phigros/charts/...`
- 模拟器内部 `./assets/...` 改为 `/phigros/whilePlaying/assets/...`

用 `asset-paths.ts` 集中管理所有路径常量，便于维护。

### 2.4 状态管理
- **设置项**：Zustand store + localStorage 持久化（键名沿用原版 `input-offset` 等 11 个 codename）。
- **成绩**：Zustand store + localStorage 持久化（`phi` 键，保留原编码格式）。
- **当前游玩谱面**：URL searchParams（不进 store，刷新即丢，符合原版语义）。
- **模拟器内部状态**：全部在 `useRef` + 模拟器闭包内，**不进 React 状态树**。

---

## 3. 详细迁移任务分解

> 每个任务标注：**Task ID** / 依赖 / 产出 / 验收标准。可并行的任务用 `X-a`/`X-b` 标记。

### 阶段 A：基础设施（前置，必须先完成）

#### Task A-1：资源迁移
- **依赖**：无
- **产出**：`public/phigros/` 下完整资源树
- **步骤**：
  1. 复制 `phigros-html5/whilePlaying/assets/` → `public/phigros/whilePlaying/assets/`（23 PNG + 4 OGG + oggmented-bundle.js + stackblur.min.js + createImageBitmap.js + clickRaw.png + demo.zip）
  2. 复制 `phigros-html5/charts/` → `public/phigros/charts/`（sample、samplePec、ouroVoros、single.json、How-To-Contribute.MD）**排除 terrasphere 目录**（谱面作者授权问题，直接删除不迁移）
  3. 复制 `phigros-html5/assets/fonts/` → `public/phigros/assets/fonts/`（20 字体 + fonts.css）
  4. 复制 `phigros-html5/assets/audio/` → `public/phigros/assets/audio/`（Tap1-7.wav + LevelOver0-3.wav，**排除 desktop.ini**）
  5. 复制 `phigros-html5/assets/images/` → `public/phigros/assets/images/`（全部，含 chapterImages 子目录）
  6. 复制 `phigros-html5/assets/tips.json` → `public/phigros/assets/tips.json`
  7. 复制 `phigros-html5/assets/autoScale.js` → `public/phigros/assets/autoScale.js`（保留备用）
  8. 复制 `phigros-html5/tapToStart/TouchToStart0.mp3` → `public/phigros/tapToStart/TouchToStart0.mp3`
  9. 复制 `phigros-html5/chapterSelect/ChapterSelect0.mp3` → `public/phigros/chapterSelect/ChapterSelect0.mp3`
  10. 复制 `phigros-html5/aboutUs/` → `public/phigros/aboutUs/`（AboutUs0/1.mp3 + snr.png）
  11. 复制 `phigros-html5/manifest.webmanifest` → `public/phigros/manifest.webmanifest`
  12. 复制 `phigros-html5/favicon.ico` → `public/phigros/favicon.ico`
- **验收**：`ls public/phigros/` 结构完整，文件数与原版一致（224 个，扣 desktop.ini）。

#### Task A-2：全局样式与字体
- **依赖**：A-1
- **产出**：`src/styles/phigros.css` + `src/app/layout.tsx` 改造
- **步骤**：
  1. 创建 `src/styles/phigros.css`，包含：
     - `@font-face` 注册 `Phigros` 和 `Mina` 字体族（指向 `/phigros/assets/fonts/Exo-Regular.otf` + `Source Han Sans & Saira Hybrid-Regular.ttf`）
     - 全局 `* { font-family: 'Phigros', 'Mina', sans-serif }`（保留原版行为）
     - 工具类 `.phigros-skew { transform: skew(-15deg) }` + `.phigros-skew-revert { transform: skew(15deg) }`
     - 动画关键帧：`fadeIn`、`float`（气泡）、`loadingBarBGAnim`、`loadingBarTXTAnim`、`slideIn`、`scaleDown`、`extract`、`darkOverlay` 系列
     - 全局 `html, body { margin: 0; padding: 0; overflow: hidden; background: #000 }`（原版禁止滚动 + 黑底）
     - 禁止缩放 meta 由 layout 注入
  2. 改造 `src/app/layout.tsx`：
     - import `phigros.css`
     - 注入 `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">`
     - 注入 `<link rel="manifest" href="/phigros/manifest.webmanifest">`
     - 注入 PWA icons
     - 保留现有 Toaster（Phigros 用不到，但不删）
     - metadata.title 改为 "Phi.ts"，description 改为 "A TypeScript Web edition of Phigros"
- **验收**：任意页面加载后字体为 Phigros，body 无滚动条，黑底。

#### Task A-3：PWA 与 Service Worker
- **依赖**：A-1
- **产出**：`public/sw.js` + layout 注入 SW 注册
- **步骤**：
  1. 创建 `public/sw.js`，保留原版策略（cache-first + 预缓存清单），但**修正两点**：
     - 预缓存清单路径改为 `/phigros/...` 前缀
     - 增加 `activate` 事件清理旧版本缓存（原版无，迁移时补上以避免缓存污染）
  2. 在 `src/app/layout.tsx` 的客户端组件中（或单独 `<script>` 注入）全局注册 SW：`navigator.serviceWorker.register('/sw.js')`
     - **修正原版缺陷**：原版仅在 `/index.html` 注册，PWA 直接从 tapToStart 启动时不注册；改为全局注册
  3. A2HS：在 layout 客户端组件监听 `beforeinstallprompt`，存到全局 ref，供 index 页 `.add-button` 使用
- **验收**：DevTools → Application → Service Workers 显示已注册；Cache Storage 有 `video-store` 条目。

#### Task A-4：通用 hooks 与 lib
- **依赖**：A-1
- **产出**：
  - `src/lib/phigros/constants.ts`：`gameLevels = { ez:0, hd:1, in:2, at:3 }` + 难度色 `#51af44/#3173b3/#be2d23/#3a3637` + URL 参数名常量
  - `src/lib/phigros/asset-paths.ts`：所有资源路径常量
  - `src/lib/phigros/score-codec.ts`：phi 字符串编解码（40 字符段：32 md5 + 3 acc base22 + 4 score base32 + 1 level base36，乱序拼接/还原）
  - `src/hooks/use-phigros-settings.ts`：Zustand store，11 个设置项，localStorage 持久化（键名沿用原 codename）
  - `src/hooks/use-phigros-score.ts`：phi 读写 + `getData(isAuto)` 逻辑
  - `src/hooks/use-auto-scale.ts`：`autoResize()` 封装
  - `src/hooks/use-audio-context.ts`：AudioContext 单例 + 用户手势 resume
  - `src/hooks/use-pwa-install.ts`：A2HS prompt
- **验收**：hooks 单元逻辑正确（不写测试，但代码 review 通过）。

#### Task A-5：谱面解析 lib（纯函数版）
- **依赖**：无
- **产出**：`src/lib/phigros/chart-parser.ts`
- **说明**：从 `script.phigros.emulator.js` 中**提取** `chart123` + `chartp23` + `chartify` + `tween` 数组，封装为纯函数模块。
- **用途**：
  1. songSelect 页可预解析谱面校验有效性
  2. 模拟器组件内部也会 import 同一份（避免重复代码）
- **注意**：逻辑 1:1 复制，不优化、不重构。PEC 的词法分析、指令系统、motionType 缓动切片全部保留。
- **验收**：对 `public/phigros/charts/sample/SpasmodicSP.json` 和 `samplePec/Tempestissimo.pec` 解析结果与原版一致（对比 numOfNotes、judgeLineList 长度）。

---

### 阶段 B：外围页面迁移（可并行，8 个页面）

> 所有外围页面遵循统一规范：
> - `'use client'`（因为大量使用 localStorage、AudioContext、window 事件）
> - 用 shadcn/ui 组件替换原生控件（Button、Switch、Slider 等），但**视觉样式用 Phigros 的 skew 风格 override**
> - 同步 XHR 全部改为 `fetch` + `await`
> - `location.href` 改为 `useRouter().push()`
> - localStorage 读写改用 `use-phigros-settings` / `use-phigros-score` hook

#### Task B-1：index 介绍页（`/`）
- **依赖**：A-2, A-3, A-4
- **产出**：`src/app/page.tsx`
- **原版对照**：`phigros-html5/index.html` + `index.js`
- **功能清单**：
  1. MPL-2 协议警告文字
  2. 进入 tapToStart 的链接
  3. 测试音频播放器（`<audio src="/phigros/tapToStart/TouchToStart0.mp3" controls>`）
  4. A2HS 按钮 `.add-button`（点击 `deferredPrompt.prompt()`）
  5. 手动缓存按钮 `#add-cache-button`（`caches.open('video-store').addAll([...])`，清单改为 `/phigros/` 前缀）
  6. 更新日志 `<pre>`（2022/01/14 - 2022/01/20 的 commit 记录，原样保留）
  7. SW 注册（已在 layout 全局注册，此页可不重复，但保留兜底）
- **验收**：页面渲染与原版一致，A2HS 按钮在支持的浏览器显示，缓存按钮点击后 DevTools Cache Storage 有 30 个文件。

#### Task B-2：tapToStart 点击开始页（`/tap-to-start`）
- **依赖**：A-2, A-4
- **产出**：`src/app/tap-to-start/page.tsx`
- **原版对照**：`phigros-html5/tapToStart/`
- **功能清单**：
  1. Phigros logo `<img>`（`/phigros/assets/images/Phigros.png`）
  2. "点 击 屏 幕 开 始" 文字
  3. 背景音乐 `<audio src="/phigros/tapToStart/TouchToStart0.mp3" autoplay loop>`
  4. `DOMContentLoaded` 后 `audio.play()`（绕过自动播放限制）
  5. 每 2s 生成白色圆形气泡 `.bubbles`，11.95s 后自动清除
  6. `@keyframes float` 气泡上升动画（12s）
  7. 背景 `InitialBackground.png` + `backdrop-filter: blur(15px)` 双层模糊
  8. 任意点击：
     - 插入 `.fadeIn` 全屏黑遮罩（0.6s 渐显）
     - `setInterval(10ms)` 音量渐弱 `audio.volume -= 0.1`
     - 510ms 后跳转：`localStorage.length==0` → `/settings`；否则 → `/chapter-select`
- **验收**：粒子动画流畅，点击后黑屏过渡 + 音量渐弱 + 跳转正确。

#### Task B-3：chapterSelect 章节选择页（`/chapter-select`）
- **依赖**：A-2, A-4
- **产出**：`src/app/chapter-select/page.tsx` + `src/components/phigros/ChapterCard.tsx`
- **原版对照**：`phigros-html5/chapterSelect/`
- **功能清单**：
  1. 章节卡片 `.chapterContainer`（`data-name` / `data-stas` / `data-codename`）
     - 目前仅 `single`（单曲 精选集），其余 12 个章节（legacy/MainStory4-7/SideStory1/KALPA/MUSEDASH/WAVEAT/Good/HyuN/RST）在原版被注释，**迁移时也保留为注释/禁用态**（不擅自启用，因为没有对应谱面数据）
  2. 章节封面 `<img src="/phigros/assets/images/chapterImages/Single.png">`
  3. `transform: skew(-15deg)` + 子元素 `skew(15deg)` 还原
  4. `::before` 显示 `data-name`，`::after` 显示 "▷ P L A Y"
  5. 背景音乐 `<audio src="/phigros/chapterSelect/ChapterSelect0.mp3" autoplay loop>`
  6. `wheel` 事件水平滚动 `document.body.style.left`，带左右边界检测
  7. 设置按钮（右下角固定，`onclick → /settings`）
  8. 点击章节：
     - 播放 `/phigros/assets/audio/Tap1.wav`
     - `.darkOverlay` 加 `fadeIn` 类
     - 400ms 后 `router.push('/song-select?c=single')`
- **验收**：章节卡片倾斜样式正确，滚轮水平滚动有边界，点击跳转有过渡。

#### Task B-4：songSelect 歌曲选择页（`/song-select`）
- **依赖**：A-4, A-5, B-3
- **产出**：
  - `src/app/song-select/page.tsx`
  - `src/components/phigros/SongList.tsx`
  - `src/components/phigros/SongItem.tsx`
  - `src/components/phigros/LevelChooser.tsx`
  - `src/components/phigros/ScoreDisplay.tsx`
- **原版对照**：`phigros-html5/songSelect/`（index.js 184 行 + SongList.js 136 行 + style.css 456 行）
- **功能清单**：
  1. 读取 `?c={chapter}` 参数
  2. `fetch('/api/charts/{chapter}')` 返回 `["sample","samplePec","ouroVoros"]`（原版同步 XHR 改 API）
  3. 对每首歌 `fetch('/api/charts/{codename}/meta')` 获取 meta.json
  4. `SongList` 组件：`createSong` / `switchSong` / `switchLevel` 工厂方法（保留原版组件化设计）
  5. `SongItem`：`data-artist` / `data-codename` / 显示曲名
  6. `SongLevel`：4 个难度色块（ez 绿/hd 蓝/in 红/at 黑），选中项 `height:120%` 凸出
  7. `LevelChooser`：4 个 `levelItem` 横排，点击切换难度
  8. `ScoreDisplay`：显示历史最高分（从 `use-phigros-score` 读取），未游玩显示 "NEW"
  9. `switchSong` 逻辑：
     - 播放 `/phigros/assets/audio/Tap5.wav`
     - 旧选中 `unSelect`，新选中 `select`
     - `fetch(illustration)` → blob → `URL.createObjectURL` → 设背景 + `<img>`
     - `audio#slicedAudioElement.src = musicFile`
     - `currentTime = songMeta.sliceAudioStart`
     - `setInterval(15s)` 循环切片播放
  10. `#rightArea` 动态 `transform: scale(innerHeight/400/devicePixelRatio/2)`
  11. `wheel` / `touchstart` / `touchmove` 监听 `#songList` 的 top 实现 Y 轴滚动
  12. `readyToLoadTrigger()`：加 `.go` 类触发 `slideIn` 动画 + 播 `Tap7.wav` + 2s 后 `router.push('/while-playing?play=...&l=...&c=...')`
  13. 返回按钮 `→ /chapter-select`
  14. 设置按钮 `→ /settings`
  15. 全场景 `transform: skew(-15deg)` + 子元素 `skew(15deg)` 还原
  16. `readyToLoadOverlay.go` 黑色斜切遮罩 `slideIn 2s cubic-bezier(0.52, 0.28, 0.04, 0.98)`
- **验收**：切歌时背景图 + 切片音频正确切换，难度切换颜色变化，播放按钮触发过渡动画后跳转。

#### Task B-5：settings 设置页（`/settings`）
- **依赖**：A-2, A-4
- **产出**：`src/app/settings/page.tsx` + `src/components/phigros/SettingSlider.tsx` + `src/components/phigros/SettingToggle.tsx`
- **原版对照**：`phigros-html5/settings/`（index.js 134 行）
- **功能清单**（**13 个设置项**，含原版被注释/缺失但代码在用的 2 项 bug 修复）：
  1. **谱面延时(MS)** `input-offset`，slider，范围 -500~500，默认 0
  2. **按键缩放** `select-scale-ratio`，slider，5 档（极小1e4/较小9e3/默认8e3/较大7e3/极大6e3），默认 8e3（对应原版隐藏 select 的 option 值，**修正**：原版 settings 显示 data-value=3 是展示用的索引，实际存 localStorage 的应是真实缩放值，迁移时统一存真实值 `8e3` 等）
  3. **背景亮度** `select-global-alpha`，slider，5 档（黑暗1/昏暗0.8/默认0.6/较亮0.4/明亮0.2），默认 0.6（同上修正，存真实 alpha 值）
  4. **开启打击音效** `hitSong`，toggle，默认开
  5. **开启多押辅助** `highLight`，toggle，默认开
  6. **游玩时自动全屏** `autoFullscreen`，toggle，默认开
  7. **开启FC/AP指示器** `lineColor`，toggle，默认关
  8. **开启HyperMode** `hyperMode`，toggle，默认关
  9. **背景模糊显示** `imageBlur`，toggle，默认开
  10. **开启触摸反馈** `feedback`，toggle，默认关
  11. **显示定位点** `showPoint`，toggle，默认关
  12. **【bug 修复·新增】显示过渡动画** `showTransition`，toggle，默认开
      - 原版 settings/index.html 第 60-63 行此设置项被注释，但模拟器 `script.phigros.emulator.js` 第 122 行 `showTransition.checked` 仍在使用（控制结尾过渡动画）。**修复**：启用此设置项，让用户可真正控制过渡动画开关
  13. **【bug 修复·新增】画面宽高比** `select-aspect-ratio`，slider/下拉，8 档（5:4=1.25 / 4:3=1.333333 / 10:7=1.428571 / 19:13=1.461538 / 8:5=1.6 / 5:3=1.666667 / 22:13=1.692308 / 16:9=1.777778），默认 16:9
      - 原版隐藏配置面板有此 `<select>`（whilePlaying/index.html 第 42-51 行），但 `resizeCanvas` 用硬编码 16:9 版本，注释掉的版本才读取 `selectaspectratio.value`。**修复**：让 `resizeCanvas` 真正读取此值，并在 settings 页暴露此设置项
  - 额外两个按钮：
    14. "关于我们" `→ /about-us`
    15. "清除全部数据" `→ localStorage.clear() → /`
  - 返回按钮：`saveSettings()`（兜底）+ `→ /chapter-select`
  - slider 点击：根据 offsetX 判断点 +/- 按钮 → 修改值 → 即时存 localStorage
  - toggle 点击：切换 → 即时存 localStorage
  - 滚动：wheel/touch 修改 `#settingItems.margin-top`
  - `loadSettings()`：DOMContentLoaded 时从 localStorage 恢复状态
- **验收**：13 个设置项读写 localStorage 正确；slider/toggle 交互与原版一致；**showTransition 切换后结尾过渡动画相应生效/禁用**；**select-aspect-ratio 切换后画面宽高比真正变化**。

#### Task B-6：LevelOver 结算页（`/level-over`）
- **依赖**：A-2, A-4
- **产出**：`src/app/level-over/page.tsx`
- **原版对照**：`phigros-html5/LevelOver/`（index.js 129 行 + style.css 353 行）
- **功能清单**：
  1. URL 参数解析：`play` / `l` / `score` / `mc` / `p` / `g` / `b` / `m` / `e` / `c`
  2. `fetch('/api/charts/{play}/meta')` 获取曲名/曲师/谱师/曲绘/难度定数
  3. 计算精度：`accuracy = round((perfect + good*0.65) / (perfect+good+bad+miss) * 10000) / 100`
  4. 计算 `late = good - early`
  5. 评级逻辑（萌娘百科规则）：
     - score==0 → 无评级
     - <700000 → F（`F15F.png`）
     - 700000-819999 → C（`C15C.png`）
     - 820000-879999 → B（`B15B.png`）
     - 880000-919999 → A（`A15A.png`）
     - 920000-959999 → S（`S15S.png`）
     - 960000-999999 → V（`V15V.png`）；若 good==0 && bad==0 && miss==0 → V15FC（`V15FC.png`）
     - >=1000000 → Phi（`phi15phi.png`）
  6. RKS 计算：`accuracy>=70 ? pow((accuracy-55)/45, 2) * levelRanking : 0`（ΔRKS，不持久化）
  7. 显示：曲绘 + 曲名 + 难度 + 分数 + 评级图 + maxCombo + accuracy + perfect/good/bad/miss + early/late + RKS
  8. 分阶段渐入动画：
     - `mainContent` slideIn 0.5s
     - `scoreFrame` slideIn 0.8s
     - `atAGlance` slideIn 1s
     - `detailFrame` slideIn 1.4s
     - `gradeImage` scaleDown 0.8s cubic-bezier(0,0,1,0.25)
     - `extraInfo` extract 2s ease-out
  9. 背景音乐 `<audio src="/phigros/assets/audio/LevelOver{levelIndex}.wav" loop>`（0/1/2/3 对应 ez/hd/in/at）
  10. retryBtn `→ /while-playing?play=...&l=...&c=...`
  11. backBtn `→ /song-select?c=...`
  12. 缩放：`transform: scale(innerHeight/480/devicePixelRatio)`，resize 时重算
- **验收**：评级图正确显示，动画分阶段渐入，RKS 计算正确，retry/back 跳转正确。

#### Task B-7：aboutUs 关于页（`/about-us`）
- **依赖**：A-2
- **产出**：`src/app/about-us/page.tsx`
- **原版对照**：`phigros-html5/aboutUs/`（index.html 1061 行 + main.html 1025 行 + main.js 57 行 + 双阶段 SPA）
- **功能清单**：
  1. **阶段一（tap-to-start）**：
     - Phigros logo
     - "touch to start" 文字
     - 样式用 `index.css`
  2. **点击切换到阶段二（credits 滚动）**：
     - 切换样式表到 `main.css`（React 中用 state 切换 className，不真的换 CSS 文件）
     - 显示 `#main` 内容
     - 加载 `main.js` 逻辑（autoScroll）
  3. **阶段二内容**（全部 1:1 移植 index.html 的 1061 行静态内容）：
     - `blackOverlay`
     - `clickToExitTag`
     - `<audio id="audioElement">`
     - 2 个 `<pre class="fromGameDirector">`（HanHan233 + Soullies 感言，中英双语）
     - 1 个 `<pre class="credits">`（247 行 Pigeon Games 全体名单，12 个分组）
     - `<img src="/phigros/aboutUs/snr.png">`（SOUL NOTES RECORDS logo）
     - 1 个 `<pre class="musicCredits">`（725 行曲目 credits，leftSide + rightSide 双列）
     - `<div class="thanksAllHelpers">`
     - `<div class="thankYou">`
  4. **autoScroll 逻辑**：
     - `audioElem.src = '/phigros/aboutUs/AboutUs0.mp3'` + play
     - `ended` 事件切换 `AboutUs0.mp3` ↔ `AboutUs1.mp3` 循环
     - `setInterval(12ms)` `document.body.style.marginTop -= 0.5px`
     - 滚到底 → 3s 后 `blackOverlay.opacity=1` → 1s 后 `router.push('/chapter-select')`
  5. **跳过逻辑**：5s 内连点 6 次 → 跳转 chapterSelect
  6. **main.html 处理**：原版 main.html 是 standalone 预览版，**迁移时不单独建路由**，统一合并到 `/about-us` 的阶段二
- **验收**：双阶段切换正常，credits 内容完整（1061 行不漏字），自动滚动 + 双音乐循环 + 跳过手势均生效。

#### Task B-8：loadingChartScreen 合并为组件
- **依赖**：A-2, A-4
- **产出**：`src/components/phigros/LoadingChartOverlay.tsx`
- **原版对照**：`phigros-html5/loadingChartScreen/` + `loadingScreen/`
- **说明**：原版用 iframe 嵌入 loadingChartScreen，迁移后改为 React 组件 overlay（不再需要 iframe）。
- **功能清单**：
  1. `mainContent`：`textInfo`（songInfoFrame + chartDesigner + illustrator）+ `songImage`
  2. `tip` + `loadingBar`（共享 loadingScreen 结构）
  3. `fetch('/api/tips')` 随机返回一条 tip（原版同步 XHR tips.json）
  4. `fetch('/api/charts/{c}/meta')` 填充 songName / artist / chartDesigner / illustrator / songImg
  5. body 背景设为曲绘
  6. `levelInfoElem` 设 `data-level` + 加 level class（ez/hd/in/at）
  7. `transform: skew(-15deg)` + 子元素 `skew(15deg)` 还原
  8. `slideAndFadeIn` 动画：曲师/曲绘从 150px → 80px margin 渐入
  9. `loadingBarBGAnim` + `loadingBarTXTAnim`
- **props**：`{ chart: string, level: string, visible: boolean }`
- **验收**：组件渲染与原版 iframe 内容一致，tip 随机显示，曲绘信息正确填充。

---

### 阶段 C：核心模拟器迁移（最关键，最高风险）

#### Task C-1：模拟器源码移植（原样 + 最小改造）
- **依赖**：A-1, A-4, A-5
- **产出**：
  - `src/components/phigros/emulator/script.phigros.emulator.ts`
  - `src/components/phigros/emulator/index.ts`
  - `src/components/phigros/emulator/types.ts`
- **原版对照**：`whilePlaying/script.phigros.emulator.js`（2366 行）+ `whilePlaying/index.js`（302 行）
- **迁移策略（最小改造原则）**：
  1. **原样复制所有函数和类**：`Click` / `Judgement` / `Judgements` / `ClickEvents` / `ClickEvent0` / `ClickEvent1` / `Timer` / `stat` / `resizeCanvas` / `adjustInfo` / `playBgm` / `loop` / `calcqwq` / `qwqdraw1` / `qwqdraw2` / `qwqdraw3` / `range` / `drawNote` / `prerenderChart` / `loadFile` / `time2Str` / `adjustSize` / `imgShader` / `imgBlur` / `hex2rgba` / `rgba2hex` / `csv2array` / `qwqImage` / `getOffsetLeft` / `getOffsetTop`
  2. **chart123 / chartp23 / chartify / tween**：改为从 `@/lib/phigros/chart-parser` import（已在 A-5 提取为纯函数），避免重复代码
  3. **全局变量处理**：
     - 原版所有 `var X` 全局变量 → 封装到一个 `EmulatorState` 对象或闭包内
     - 需要跨函数共享的：`Renderer` / `chartLine` / `chartLineData` / `bgs` / `mouse` / `touch` / `keyboard` / `taps` / `specialClick` / `isMouseDown` / `curTime` / `curTimestamp` / `timeBgm` / `timeChart` / `duration` / `isInEnd` / `isOutStart` / `isOutEnd` / `isPaused` / `fucktemp` / `fucktemp2` / `stopDrawing` / `stopPlaying` / `wlen` / `hlen` / `wlen2` / `hlen2` / `noteScale` / `lineScale` / `qwqIn` / `qwqOut` / `qwqEnd` / `stat` / `judgements` / `clickEvents0` / `clickEvents1` / `res` / `comboColor` / `frameTimer`
  4. **DOM 引用处理**：
     - 原版用 `getElementById` 获取的元素 → 在组件 `useEffect` 中用 `ref` 获取，传入模拟器初始化函数
     - 必须保留的 id：`canvas` / `btn-play` / `btn-pause` / `pauseOverlay` / `backBtn` / `restartBtn` / `resumeBtn` / `upload` / `uploads` / `mask` / `select` / `selectbg` / `selectbgm` / `selectchart` / `selectscaleratio` / `selectaspectratio` / `selectglobalalpha` / `inputName` / `inputLevel` / `inputDesigner` / `inputIllustrator` / `inputOffset` / `feedback` / `imageBlur` / `highLight` / `hitSong` / `lineColor` / `showPoint` / `hyperMode` / `showTransition`
     - **隐藏配置面板**（原版 `.hide` div 内的所有 select/input/checkbox）→ 在组件 JSX 中用 `<div className="hidden">` 还原，因为代码通过 `getElementById` 访问它们的 `value`/`checked`
  5. **外部库加载**：
     - `oggmented-bundle.js`：在 `useEffect` 中动态注入 `<script src="/phigros/whilePlaying/assets/oggmented-bundle.js">`，等 `window.oggmented` 就绪
     - `stackblur.min.js`：同上动态注入，等 `window.StackBlur` 就绪
     - `zip.min.js`（CDN）：**【bug 修复·清理死代码】** 原版加载了 zip.js 且 `loadFile` 函数引用它，但 `loadFile` 本身及 `upload.onchange` 监听器在原版均已被整段注释（emulator.js 第 279、881-892 行），即 zip.js 是完全未使用的死依赖。迁移时**删除 zip.js 加载**，同时**删除已注释的 `loadFile` / `upload.onchange` 死代码块**，保持代码整洁
  6. **AudioContext 初始化**：保留原版 OGG 检测逻辑 `new Audio().canPlayType("audio/ogg") == "" ? new oggmented.OggmentedAudioContext() : new AudioContext()`
  7. **资源加载**：
     - `window.onload` 中的 25 个内置资源加载 → 改为 `useEffect` 中的 async 函数
     - 路径改为 `/phigros/whilePlaying/assets/...`
     - 派生资源（JudgeLineMP/AP/FC、TapBad、Clicks、Ranks）原样生成
     - `window.ResourcesLoad` 保留（组件内部用 ref 跟踪）
  8. **谱面/曲绘/音乐加载**（原 index.js 逻辑）：
     - 同步 XHR `meta.json` → 改 `fetch`
     - 异步 XHR 谱面 → `fetch` + `chart123(chartp23(text))` 或 `chart123(JSON.parse(text))`
     - `createImageBitmap` 保留
     - `imgBlur` + StackBlur 保留
     - `lineTexture` 配置 + 贴图加载保留
     - `actx.decodeAudioData` 保留
  9. **资源就绪检测**：保留 `setInterval` 轮询 `Renderer` 12 字段 + `ResourcesLoad==200`，就绪后移除 `LoadingChartOverlay`
  10. **tapToStartFrame**：原版是 overlay，迁移后用 `LoadingChartOverlay` 组件替代；点击后检查就绪 → 可选全屏 → `btnPlay.click()`
  11. **`replay()` 全局函数**：原版 HTML `onclick="replay()"` → 改为组件内 ref 暴露的方法，pauseOverlay 的按钮用 React onClick 绑定
  12. **`btnPause.click()` 全局调用**：同上，改为 ref 方法
  13. **pauseOverlay 倒计时 Bug**：原版用 `innerHTML` 重写会丢事件监听器，迁移时**修正为 React 条件渲染**（状态机：`'paused' | 'countdown-3' | 'countdown-2' | 'countdown-1' | 'playing'`），但倒计时数值与时长（3-2-1 各 1s）完全保留
  14. **跳转 LevelOver**：`location.href = '../LevelOver/...'` → `router.push('/level-over?...')`，URL 参数格式不变
  15. **LevelOver 音频路径 Bug 修正**：原版 `src/LevelOver${difficulty}.ogg` 路径错误（文件在 `assets/` 下），迁移时修正为 `/phigros/whilePlaying/assets/LevelOver${difficulty}${_v2?}.ogg`
  16. **【bug 修复】`selectaspectratio` 未生效**：原版 `resizeCanvas`（emulator.js 第 213-238 行）是硬编码 16:9 版本，注释掉的版本（第 239-257 行）才会读取 `selectaspectratio.value`。**修复方案**：采用注释版的逻辑——让 `defaultWidth = defaultHeight * (selectaspectratio.value || 16/9)`，并在 settings 页暴露此设置项（见 Task B-5 第 13 项）。同时恢复 `selectscaleratio` / `selectaspectratio` 的 `change → resizeCanvas` 监听（原版第 210-211 行已注释）。注意：`AspectRatio` 常量（第 129 行 `16/9`）是宽高比**上限**（用于 `canvasos.width = min(realWidth, realHeight * AspectRatio)`），与 `selectaspectratio` 是不同概念，保留不变
  17. **settings 应用**：原版 `for (i in Object.keys(localStorage))` 遍历设置表单 → 改为从 `use-phigros-settings` store 读取，应用到隐藏配置面板的元素 value/checked
  18. **`<script await>` 处理**：原版非标准属性，迁移后在 `useEffect` 中按顺序动态加载（oggmented → stackblur → emulator init），用 await 保证顺序
  19. **imgBlur / StackBlur**：保留原版 `StackBlur.imageDataRGB` 调用
  20. **createImageBitmap**：依赖原生 API，不加 polyfill
  21. **`autoplay` 硬编码无 UI**：原版 `const autoplay = {'checked':false}`（emulator.js 第 120 行）是硬编码对象，无 DOM 元素也无设置项。原版 index.html 更新日志（2022/01/20）说明"为避免低创视频出现，删除了 Autoplay 功能"。**这是产品决策而非 bug，保留硬编码 `false` 不变**，代码中 `autoplay.checked` 的三处引用（第 344 行自动判定、第 1553 行显示 "Autoplay" 文字、第 1631 行 `stat.getData(autoplay.checked)`）保持原样，因始终为 false 实际不触发自动游玩逻辑。DOM 引用清单中移除 `autoplay`（无需保留对应元素）
- **验收标准（极严）**：
  - 谱面 `sample/SpasmodicSP.json`（JSON v3）和 `samplePec/Tempestissimo.pec`（PEC）均能正确加载并游玩
  - 判定窗口数值与原版一致（Perfect ±80ms / Good ±160ms / HyperMode ±120ms）
  - 分数计算公式与原版一致（hyperMode 与非 hyperMode 两套公式）
  - stat.getData 返回 `[isNewRecord, scoreBestStr, delta, isAuto]` 格式正确
  - phi localStorage 编码与原版兼容（老数据可读）
  - 音频-画面同步误差 ≤ ±30ms
  - 稳定 60fps
  - 暂停/继续/重试功能正常
  - 四角双击触发暂停/重试/全屏正常
  - 结算跳转 URL 参数完整
  - **【bug 修复验证】`selectaspectratio` 切换 8 档宽高比后画面真正变化**
  - **【bug 修复验证】`showTransition` 开关后结尾过渡动画相应生效/禁用**
  - **【bug 修复验证】zip.js 不再加载，无控制台 404/未使用警告**
  - **【bug 修复验证】LevelOver 结算音乐正常播放（路径已修正）**
  - **【bug 修复验证】pauseOverlay 暂停/继续/重试按钮在多次倒计时后仍可点击（事件监听不丢失）**

#### Task C-2：PhigrosEmulator client 组件
- **依赖**：C-1
- **产出**：`src/components/phigros/PhigrosEmulator.tsx`
- **职责**：
  1. `'use client'`
  2. 接收 props：`{ play: string, level: string, chapter: string }`（从 URL searchParams 传入）
  3. 渲染 DOM 结构（还原 `whilePlaying/index.html` 的 168 行）：
     - `<canvas id="canvas" className="canvas fade">`
     - `<input id="btn-play" className="hide" type="button" value="播放">`
     - `<div className="pauseOverlay" id="pauseOverlay">`（含 backBtn / restartBtn / resumeBtn）
     - `<div className="hide">` 隐藏配置面板（所有 select/input/checkbox，id 必须与原版一致）
  4. `useEffect` 中：
     - 动态加载 3 个外部库
     - 初始化模拟器（调用 C-1 的 init 函数）
     - 加载内置资源（25 个）
     - 加载谱面/曲绘/音乐
     - 资源就绪后显示 tapToStart overlay
     - 点击后启动游戏
  5. `useRef` 持有所有模拟器内部状态（不进 React state）
  6. 清理函数：`cancelAnimationFrame` + 停止所有音频 + 移除事件监听
  7. 渲染 `<LoadingChartOverlay>` 作为加载遮罩
- **验收**：组件挂载后能完整运行游戏，卸载时无内存泄漏。

#### Task C-3：while-playing 页面
- **依赖**：C-2
- **产出**：`src/app/while-playing/page.tsx`
- **职责**：
  1. Server Component（薄壳），读取 searchParams
  2. 动态 import `PhigrosEmulator`（`ssr: false`，避免 SSR 拖累首屏）
  3. 传递 `play` / `level` / `chapter` props
- **验收**：访问 `/while-playing?play=sample&l=in&c=Single` 能加载游戏。

---

### 阶段 D：API 路由（替代同步 XHR）

#### Task D-1：章节歌曲列表 API
- **依赖**：A-1
- **产出**：`src/app/api/charts/[chapter]/route.ts`
- **功能**：`GET /api/charts/single` → 读取 `public/phigros/charts/single.json` → 返回 `["sample","samplePec","ouroVoros"]`
- **验收**：curl 返回正确数组。

#### Task D-2：谱面 meta API
- **依赖**：A-1
- **产出**：`src/app/api/charts/[chapter]/meta/route.ts`
- **功能**：`GET /api/charts/sample/meta` → 读取 `public/phigros/charts/sample/meta.json` → 返回 JSON
- **验收**：返回 meta 完整字段。

#### Task D-3：谱面文件 API
- **依赖**：A-1
- **产出**：`src/app/api/charts/[chapter]/chart/route.ts`
- **功能**：`GET /api/charts/sample/chart?l=in` → 根据 meta 中的 `chartIN` 字段读取对应谱面文件 → 返回 text/plain（PEC）或 application/json
- **验收**：返回谱面原文。

#### Task D-4：曲绘 API
- **依赖**：A-1
- **产出**：`src/app/api/charts/[chapter]/illustration/route.ts`
- **功能**：`GET /api/charts/sample/illustration` → 读取 meta 中的 `illustration` 字段 → 返回 image/png 或 image/jpeg
- **验收**：浏览器能直接作为 img src。

#### Task D-5：音乐 API
- **依赖**：A-1
- **产出**：`src/app/api/charts/[chapter]/music/route.ts`
- **功能**：`GET /api/charts/sample/music` → 读取 meta 中的 `musicFile` 字段 → 返回 audio/ogg 或 audio/mpeg，支持 Range 请求
- **验收**：`<audio>` 能播放。

#### Task D-6：tips API
- **依赖**：A-1
- **产出**：`src/app/api/tips/route.ts`
- **功能**：`GET /api/tips` → 读取 `public/phigros/assets/tips.json` → 随机返回一条 tip 字符串
- **验收**：多次请求返回不同 tip。

---

### 阶段 E：集成与验收

#### Task E-1：全链路联调
- **依赖**：A, B, C, D 全部完成
- **步骤**：
  1. 启动 dev server
  2. 按完整路由流程走一遍：`/` → tap-to-start → chapter-select → song-select → while-playing → level-over → retry / back
  3. 首次访问走 settings 分支
  4. 测试 3 个谱面（sample JSON / samplePec PEC / ouroVoros PEC；terrasphere 已删除不测）
  5. 测试 4 个难度（ez/hd/in/at）
  6. 测试 HyperMode 开关
  7. 测试暂停/继续/重试
  8. 测试设置项变更生效
  9. 测试成绩持久化（刷新后 phi 仍在）
- **验收**：全流程无报错，与原版体验一致。

#### Task E-2：Agent Browser 自检（强制）
- **依赖**：E-1
- **步骤**：用 Agent Browser 访问 `/`，验证：
  1. 首页渲染正常（无白屏、无 hydration 报错）
  2. tap-to-start 点击后跳转
  3. chapter-select 章节卡片显示
  4. song-select 切歌/切难度
  5. while-playing 游戏加载 + 游玩 + 结算
  6. level-over 评级显示
  7. settings 设置项读写
  8. about-us 滚动 credits
  9. 移动端 + 桌面端响应式
  10. sticky footer（如有）
- **验收**：Agent Browser 截图无异常，控制台无报错。

#### Task E-3：性能基准测试
- **依赖**：E-2
- **步骤**：
  1. DevTools Performance 录制游玩 60s
  2. 检查帧率曲线（应稳定 60fps）
  3. 检查音频-画面同步（录屏逐帧核对判定）
  4. 检查内存占用（无持续增长）
  5. 检查首屏加载时间（LCP）
- **验收**：帧率 ≥ 58fps，同步误差 ≤ ±30ms，无内存泄漏。

#### Task E-4：跨浏览器测试
- **依赖**：E-3
- **步骤**：在 Chrome / Safari / Firefox / iOS Safari 测试
  1. OGG 兼容（Safari 走 oggmented）
  2. AudioContext resume（iOS 用户手势后）
  3. 触摸事件（passive: false）
  4. 全屏 API 兼容
- **验收**：四大浏览器均能正常游玩。

---

## 4. 任务依赖与并行度

```
阶段 A（基础设施，串行）:
  A-1 → A-2, A-3, A-4, A-5（A-1 完成后并行）

阶段 B（外围页面，B 全部并行）:
  B-1, B-2, B-3, B-5, B-6, B-7, B-8 并行
  B-4 依赖 B-3（章节卡片复用）

阶段 C（核心模拟器，串行）:
  C-1 → C-2 → C-3

阶段 D（API，全部并行）:
  D-1, D-2, D-3, D-4, D-5, D-6 并行

阶段 E（集成，串行）:
  E-1 → E-2 → E-3 → E-4
```

**最大并行度**：A 阶段 4 并行 + B 阶段 7 并行 + C 阶段 1（串行）+ D 阶段 6 并行。

---

## 5. 工时估算（按任务）

| Task | 工时 | 说明 |
|------|------|------|
| A-1 资源迁移 | 1h | 纯复制 |
| A-2 全局样式字体 | 2h | fonts.css + 关键帧 + layout 改造 |
| A-3 PWA/SW | 2h | sw.js 改写 + 全局注册 |
| A-4 hooks/lib | 4h | 6 个 hook + score-codec |
| A-5 谱面解析 lib | 4h | chart123 + chartp23 + tween 提取 |
| B-1 index 页 | 1h | 简单介绍页 |
| B-2 tapToStart | 2h | 粒子 + fadeIn + 音量渐弱 |
| B-3 chapterSelect | 2h | 倾斜卡片 + 水平滚动 |
| B-4 songSelect | 6h | 最复杂外围页（切歌/切难度/切片音频/滚动） |
| B-5 settings | 3h | 11 个设置项 + slider/toggle |
| B-6 LevelOver | 3h | 评级 + RKS + 分阶段动画 |
| B-7 aboutUs | 4h | 1061 行静态内容 + 双阶段 SPA + autoScroll |
| B-8 LoadingChartOverlay | 2h | 合并 iframe |
| C-1 模拟器移植 | 16h | **最关键**，2366+302 行原样移植 + 最小改造 |
| C-2 PhigrosEmulator 组件 | 4h | useEffect + ref + DOM 还原 |
| C-3 while-playing 页 | 1h | 薄壳 |
| D-1~D-6 API | 3h | 6 个简单路由 |
| E-1 全链路联调 | 4h | 4 谱面 × 4 难度 |
| E-2 Agent Browser 自检 | 3h | 强制 |
| E-3 性能基准 | 3h | 帧率/同步/内存 |
| E-4 跨浏览器 | 4h | 4 浏览器 |
| **合计** | **~74h** | 全职约 2 周 |

> **注**：这是"完全对齐、不偷懒"的保守估算。C-1 模拟器移植是最大变量，若遇到全局变量冲突或库加载顺序问题，可能 +4-8h。

---

## 6. 关键技术决策记录

### 决策 1：模拟器不重写，只封装
**理由**：2366 行命令式 Canvas 代码已调好性能与判定，React 化重写会引入不可预测的延迟，破坏节奏游戏体验。原样封装保留所有调优。

### 决策 2：隐藏配置面板保留 DOM
**理由**：模拟器代码通过 `getElementById` 访问 `selectscaleratio` / `inputOffset` / `hyperMode` 等 15+ 个表单元素的 `value`/`checked`。若改为 React 受控组件，需大改模拟器内部读取逻辑，违背"原样"原则。保留隐藏 DOM，用 `use-phigros-settings` 同步其 value/checked。

### 决策 3：外部库动态注入而非 npm
**理由**：`oggmented-bundle.js` 和 `stackblur.min.js` 是特定版本，npm 上的 `stackblur-canvas` 和 `oggmented` API 可能不一致。动态注入原版文件保证行为 1:1。

### 决策 4：同步 XHR 改 fetch + API
**理由**：Next.js 环境下同步 XHR 会阻塞渲染且不推荐。改 `fetch` + API 路由，既符合 Next.js 规范，又能利用 SW 缓存。

### 决策 5：iframe loadingChartScreen 改组件
**理由**：React 中用 iframe 嵌入同源页面是反模式。改为 `LoadingChartOverlay` 组件，状态由父组件控制，更符合 React 范式。

### 决策 6：phi localStorage 编码保留
**理由**：老用户数据兼容。若改用 JSON，老玩家的最佳成绩会丢失。

### 决策 7：pauseOverlay 倒计时 Bug 修正为 React 状态机
**理由**：原版用 `innerHTML` 重写丢事件监听器是明确 Bug。React 中用状态机（`'paused' | 'countdown-3' | 'countdown-2' | 'countdown-1' | 'playing'`）更健壮，且数值/时长（3-2-1 各 1s）完全保留。不影响任何游戏逻辑，只影响暂停 UI 的实现方式。

### 决策 8：LevelOver 音频路径 Bug 修正
**理由**：原版 `src/LevelOver${difficulty}.ogg` 路径错误导致 404，文件实际在 `assets/` 下。迁移时修正为 `/phigros/whilePlaying/assets/LevelOver${difficulty}${_v2?}.ogg`，否则结算音乐无法播放。明确硬伤修复。

### 决策 9：【修订】`selectaspectratio` 未生效 Bug 修复（原"保留不修"已废弃）
**理由**：原版隐藏配置面板有 `select-aspect-ratio` 的 `<select>`（8 档宽高比），但 `resizeCanvas` 用了硬编码 16:9 的版本，注释掉的版本才会读取该值——这是"设置项存在但不生效"的明确 bug。用户已允许修复。**修复方案**：采用注释版 `resizeCanvas` 逻辑，让 `defaultWidth = defaultHeight * (selectaspectratio.value || 16/9)`，并在 settings 页暴露此设置项（8 档可选），恢复 `change → resizeCanvas` 监听。`AspectRatio` 常量（宽高比上限）保留不变。

### 决策 10：【修订】terrasphere 谱面直接删除（原"保持禁用"已废弃）
**理由**：原版因谱面作者授权原因将 `meta.json` 改名为 `meta.blocked.json` 禁用此曲。用户明确要求直接删除，不保留、不启用。迁移时整个 `charts/terrasphere/` 目录不复制到 `public/phigros/charts/`，同时清理原克隆仓库中的该目录。这是最干净的版权风险规避。

### 决策 11：【新增】`showTransition` 设置项启用
**理由**：原版 settings 页此设置项被注释，但模拟器代码 `showTransition.checked` 仍在使用（控制结尾过渡动画）。这是"设置项缺失但逻辑在用"的 bug。修复：在 settings 页启用此 toggle，默认开，让用户可真正控制过渡动画。

### 决策 12：【新增】zip.js 死依赖清理
**理由**：原版加载 zip.js 且 `loadFile` 函数引用它，但 `loadFile` 及 `upload.onchange` 均已被整段注释，zip.js 是完全未使用的死依赖。迁移时删除 zip.js 加载与已注释的死代码块，保持整洁。这属于"清理无效依赖"的 bug 修复。

### 决策 13：【新增】`autoplay` 保留硬编码关闭（非 bug）
**理由**：原版 `const autoplay = {'checked':false}` 是产品决策（更新日志："为避免低创视频出现，删除了 Autoplay 功能"），非 bug。保留硬编码 `false`，代码中三处 `autoplay.checked` 引用保持原样（因始终 false 不触发自动游玩）。不暴露 UI 设置项。

---

## 7. 已知问题清单（原版 Bug 与处理方式）

> 用户已明确允许修复所有 bug。下表按"Bug 修复"与"非 Bug（产品决策/架构选择）"分类，每条标注根因与验收方式。

### 7.1 Bug 修复清单（全部修复）

| # | 问题 | 位置 | 根因 | 修复方案 | 验收方式 |
|---|------|------|------|----------|----------|
| 1 | LevelOver 结算音乐 404 不播放 | emulator.js `qwqdraw2` 约 1600 行 | 路径 `src/LevelOver${difficulty}.ogg` 错误，文件实际在 `assets/` 目录下 | 修正为 `/phigros/whilePlaying/assets/LevelOver${difficulty}${_v2?}.ogg` | 游玩结束到结算页时能听到揭榜音乐循环播放 |
| 2 | `selectaspectratio` 设置项存在但不生效 | emulator.js 213-238 行（生效版）vs 239-257 行（注释版） | `resizeCanvas` 用了硬编码 16:9 的生效版，注释版才会读取 `selectaspectratio.value`；同时 `change` 监听（210-211 行）也被注释 | 采用注释版逻辑：`defaultWidth = defaultHeight * (selectaspectratio.value \|\| 16/9)`；恢复 `selectscaleratio`/`selectaspectratio` 的 `change → resizeCanvas` 监听；在 settings 页暴露 8 档宽高比设置项 | settings 切换 8 档宽高比，画面比例真正变化；切换按键缩放，note 大小变化 |
| 3 | `showTransition` 设置项缺失但逻辑在用 | settings/index.html 60-63 行（被注释）；emulator.js 122 行 `showTransition.checked` 仍使用 | settings 页此 toggle 被注释掉，但模拟器仍读取其值控制结尾过渡动画 | 在 settings 页启用此 toggle（默认开），与其它设置项一致地持久化到 localStorage | settings 关闭过渡动画后，游玩结束直接跳结算页无过渡；开启则有过渡 |
| 4 | `pauseOverlay` 倒计时丢事件监听器 | emulator.js 1258-1296 行 | 倒计时用 `pauseOverlay.innerHTML = "3"` 重写，破坏 backBtn/restartBtn/resumeBtn 的 DOM 引用，靠重新写入 `onclick` 字符串恢复（脆弱） | 改为 React 状态机：`'paused' \| 'countdown-3' \| 'countdown-2' \| 'countdown-1' \| 'playing'`，按钮用 JSX 条件渲染 + onClick 绑定。倒计时数值与时长（3-2-1 各 1s）完全保留 | 多次暂停→倒计时→继续后，三个按钮始终可点击；无 console 报错 |
| 5 | `<script await>` 非标准属性 | whilePlaying/index.html 165 行 | `await` 是旧 Chrome 实验属性，非标准，跨浏览器行为不一致 | useEffect 中按顺序动态加载：oggmented → stackblur → emulator init，用 await 保证顺序 | 各浏览器加载顺序正确，`window.oggmented`/`window.StackBlur` 就绪后才初始化 |
| 6 | SW 仅在 `/index.html` 注册 | index.js（仅此一处注册） | PWA `start_url` 指向 tapToStart，若用户从未访问 index.html 则 SW 不注册，PWA 离线失效 | 在 root layout 客户端组件全局注册 `/sw.js` | DevTools → Application → Service Workers 在任意页面均显示已注册 |
| 7 | zip.js 死依赖加载 | whilePlaying/index.html 11 行加载；emulator.js `loadFile`（279 行引用）+ `upload.onchange`（881-892 行）均已整段注释 | zip.js 被 `<script>` 加载但无任何活跃代码调用，纯死依赖，浪费带宽且产生 console 警告 | 删除 zip.js 的 `<script>` 加载；删除已注释的 `loadFile`/`upload.onchange` 死代码块 | Network 面板无 zip.min.js 请求；console 无未使用警告 |
| 8 | `select-scale-ratio` / `select-global-alpha` 值存储不一致 | settings/index.js 用 `data-value` 索引（3）展示，但模拟器读取 `select.value` 是真实值（8e3/0.6） | settings 页 slider 存的是档位索引，隐藏 select 存的是真实值，两套体系不统一 | 迁移时统一存真实值到 localStorage（`select-scale-ratio=8000`、`select-global-alpha=0.6`），settings slider 内部映射档位↔真实值 | localStorage 中存的是真实数值；模拟器读取后行为与原版一致 |
| 9 | `desktop.ini` 混入 audio 目录 | assets/audio/desktop.ini | Windows 文件夹元数据误入仓库 | 资源迁移时排除此文件 | `public/phigros/assets/audio/` 无 desktop.ini |
| 10 | `line.copy.json` 带中文注释 | charts/sample/line.copy.json | 带注释的说明版，不应部署但模拟器只读 `line.json` 不受影响 | 保留文件但确保模拟器只读 `line.json` | 模拟器加载 sample 谱面时判定线贴图正常 |

### 7.2 非 Bug（产品决策 / 架构选择，保留原样）

| # | 情况 | 位置 | 说明 | 处理 |
|---|------|------|------|------|
| 11 | terrasphere 谱面被禁用 | charts/terrasphere/（4 个文件：mp3/pec/jpg/meta.blocked.json） | 原版因谱面作者授权原因改名禁用 | **直接删除整个 terrasphere 目录**，不迁移到 public、不保留禁用态。同时清理原克隆仓库 phigros-html5/charts/terrasphere/ |
| 12 | chapterSelect 13 个章节被注释 | chapterSelect/index.html | 原版仅启用 `single`，其余章节无对应谱面数据 | 保留注释/禁用态，仅 single 可用 |
| 13 | `autoScale.js` 在 loadingChartScreen 已注释 | loadingChartScreen | 原版已弃用此通用缩放，各页自实现 resize | 不引入 autoScale.js，各页保留自己的 resize 逻辑 |
| 14 | `main.html` 是 standalone 预览版 | aboutUs/main.html | 开发预览用，非生产路由 | 不单独建路由，内容合并到 `/about-us` 阶段二 |
| 15 | `autoplay` 硬编码 `{checked:false}` 无 UI | emulator.js 120 行 | 原版更新日志（2022/01/20）："为避免低创视频出现，删除了 Autoplay 功能"——产品决策 | 保留硬编码 `false`，三处 `autoplay.checked` 引用原样（因 false 不触发自动游玩），不暴露 UI |

---

## 8. 验收检查清单（逐项打勾，全部通过才算完成）

### 功能完整性
- [ ] 9 个页面全部可访问
- [ ] 完整路由流程：index → tapToStart → chapterSelect → songSelect → whilePlaying → LevelOver → retry/back
- [ ] 首次访问走 settings 分支
- [ ] 3 个谱面（sample/samplePec/ouroVoros 可用；terrasphere 已删除）
- [ ] 4 个难度（ez/hd/in/at）切换
- [ ] PEC 和 JSON 两种谱面格式均能解析
- [ ] 判定系统（Perfect/Good/Miss + Early/Late）
- [ ] 暂停/继续/重试
- [ ] 四角双击触发暂停/重试/全屏
- [ ] 结算评级（F/C/B/A/S/V/V15FC/Phi）
- [ ] RKS 计算
- [ ] 成绩持久化（phi localStorage）
- [ ] 13 个设置项读写（含 bug 修复新增的 showTransition + select-aspect-ratio）
- [ ] aboutUs 双阶段 + autoScroll + 跳过手势
- [ ] A2HS 安装
- [ ] SW 资源缓存

### 视觉对齐
- [ ] Phigros 字体生效
- [ ] skew(-15deg) 倾斜样式
- [ ] 黑白配色
- [ ] 所有动画时长/缓动曲线与原版一致
- [ ] 评级图正确显示
- [ ] 章节卡片样式
- [ ] 歌单难度色块
- [ ] 结算页分阶段渐入

### 性能体验
- [ ] 稳定 60fps
- [ ] 音频-画面同步误差 ≤ ±30ms
- [ ] 判定窗口数值与原版一致
- [ ] 输入响应 ≤ 16ms
- [ ] 无内存泄漏
- [ ] 首屏加载合理

### 数据兼容
- [ ] localStorage 键名与原版一致（11 个原设置 + 2 个 bug 修复新增 + phi）
- [ ] phi 编码格式与原版兼容（老数据可读）
- [ ] URL 参数语义与原版一致

### Bug 修复验证（对应 §7.1）
- [ ] **Bug 1**：LevelOver 结算音乐正常循环播放（不再 404）
- [ ] **Bug 2**：settings 切换 8 档宽高比，画面比例真正变化；切换按键缩放 note 大小变化
- [ ] **Bug 3**：settings 关闭 showTransition 后游玩结束无过渡动画，开启则有
- [ ] **Bug 4**：pauseOverlay 多次暂停→倒计时→继续后，back/restart/resume 三按钮始终可点击
- [ ] **Bug 5**：各浏览器外部库加载顺序正确（oggmented→stackblur→init）
- [ ] **Bug 6**：任意页面 DevTools 均显示 SW 已注册
- [ ] **Bug 7**：Network 面板无 zip.min.js 请求；console 无未使用警告
- [ ] **Bug 8**：localStorage 中 select-scale-ratio/select-global-alpha 存的是真实数值
- [ ] **Bug 9**：`public/phigros/assets/audio/` 无 desktop.ini
- [ ] **Bug 10**：sample 谱面判定线贴图正常加载（只读 line.json）

### 跨端
- [ ] Chrome / Safari / Firefox / iOS Safari 均正常运行
- [ ] OGG 兼容（Safari 走 oggmented）
- [ ] 触摸/鼠标/键盘输入
- [ ] 响应式布局

---

## 9. 回退方案

若 C-1 模拟器移植遇到不可逾越的障碍（如全局变量冲突无法解决），**回退策略**：
1. 将原版 `whilePlaying/` 整个目录原样放入 `public/phigros/whilePlaying/`
2. `/while-playing` 页面用 `<iframe src="/phigros/whilePlaying/index.html?...">` 嵌入
3. 外围页面仍用 Next.js 重写
4. 这样最保守，但失去 Next.js 工程化对模拟器的管理

此回退方案作为最后兜底，正常情况下应优先完成 C-1 的封装式移植。

---

## 10. Roadmap 全局路线图

> 以里程碑（Milestone）形式展示从启动到最终交付的完整路径。阶段一（M1–M5）为当下交付目标；阶段二（M6–M8）为后期演进，独立排期。

### 10.1 里程碑总览

```
阶段一·封装跑通（~74h，全职约 2 周）
 ┌─────────────────────────────────────────────────────────────┐
 │  M1 基础设施   →   M2 外围页面   →   M3 核心模拟器          │
 │  (~13h)           (~23h)            (~21h)                  │
 │                                       ↓                      │
 │                  M4 API 联调   →   M5 集成验收 → 阶段一交付 │
 │                  (~3h)            (~14h)        🎉           │
 └─────────────────────────────────────────────────────────────┘

阶段二·TS 重写（~86h，独立排期，不阻塞阶段一）
 ┌─────────────────────────────────────────────────────────────┐
 │  M6 黄金基准   →   M7 TS 模块化重写   →   M8 基准回归        │
 │  (~6h)             (~80h)               (~6h) → 阶段二交付  │
 │                                                   🎉        │
 └─────────────────────────────────────────────────────────────┘
```

### 10.2 里程碑明细

| 里程碑 | 名称 | 内容 | 工时 | 依赖 | 验收标志 |
|--------|------|------|------|------|----------|
| **M1** | 基础设施就绪 | A 阶段全部完成：资源迁移到 `public/phigros/`、全局 Phigros 样式与字体、PWA/SW 全局注册、6 个 hooks/lib、谱面解析纯函数模块 | ~13h | — | `public/phigros/` 资源完整；任意页字体生效；DevTools 显示 SW 已注册；`chart-parser.ts` 能解析 JSON+PEC 两种谱面 |
| **M2** | 外围页面可用 | B 阶段全部完成：8 个外围页面（index/tapToStart/chapterSelect/songSelect/settings/LevelOver/aboutUs/LoadingOverlay）用 Next.js + shadcn/ui 重写 | ~23h | M1 | 8 个页面均可访问；路由跳转正确；13 个设置项读写 localStorage；aboutUs 双阶段+autoScroll 正常；LevelOver 评级与 RKS 计算正确 |
| **M3** | 核心模拟器跑通 | C 阶段全部完成：2366+302 行模拟器原样封装为 `PhigrosEmulator` client 组件，最小改造（去全局、接 React 生命周期），挂载到 `/while-playing` 页 | ~21h | M1 | 3 个谱面（sample/samplePec/ouroVoros）均能加载并完整游玩；判定/暂停/重试/结算全流程通畅 |
| **M4** | API 联调完成 | D 阶段全部完成：6 个 API 路由（charts 列表/meta/chart/illustration/music/tips）替代原版同步 XHR | ~3h | M1 | songSelect 切歌、whilePlaying 加载谱面均通过 API 获取数据；无同步 XHR 残留 |
| **M5** | 集成验收通过 | E 阶段全部完成：全链路联调 + Agent Browser 自检 + 性能基准 + 跨浏览器测试 | ~14h | M2,M3,M4 | §8 验收清单全部打勾；Agent Browser 截图无异常；稳定 60fps；音画同步 ≤±30ms；Chrome/Safari/Firefox/iOS 均正常 → **阶段一交付 🎉** |
| **M6** | 黄金基准录制 | 选 3 个代表谱面，autoplay 跑完，录制判定快照+帧截图+音画时序 | ~6h | M5 | 基准测试集存档完成，可作为重写后的回归对照 |
| **M7** | TS 模块化重写 | 按 timer→stat→judgement→audio→input→renderer 顺序逐模块用 TS 重写，每模块跑基准 | ~80h | M6 | 所有模块重写完成；两套实现并存（环境变量切换）；每个模块重写后基准比对通过 |
| **M8** | 基准回归通过 | 删除封装版，全量跑黄金基准，性能对标阶段一 | ~6h | M7 | 判定快照 bit-for-bit 一致；帧截图一致；60fps 达标；封装版已清理 → **阶段二交付 🎉** |

### 10.3 关键路径与并行度

```
M1 ─┬─> M2 ──┐
    │         ├──> M5 (验收) ──> 阶段一交付
    ├─> M3 ──┤
    │         │
    └─> M4 ──┘
         (M2/M3/M4 可并行，M5 须等三者齐)

M5 ──> M6 ──> M7 ──> M8 ──> 阶段二交付
      (阶段二串行，不阻塞阶段一)
```

**阶段一最大并行度**：M1 完成后，M2（外围 7 页并行）/ M3（模拟器串行）/ M4（6 API 并行）可同时推进。

### 10.4 阶段一交付物清单（M5 完成时）

- [ ] 9 个页面全部可访问且功能完整
- [ ] 3 个谱面（sample/samplePec/ouroVoros）可完整游玩
- [ ] 13 个设置项生效（含 bug 修复的 showTransition + select-aspect-ratio）
- [ ] 10 个原版 bug 全部修复（§7.1）
- [ ] PWA + SW 全局注册，A2HS 可用
- [ ] localStorage 成绩持久化（phi 编码兼容老数据）
- [ ] Agent Browser 自检通过
- [ ] 性能基准达标（60fps / 同步 ≤±30ms）
- [ ] 跨浏览器测试通过（Chrome/Safari/Firefox/iOS）
- [ ] 源自 phigros-html5 的文件保留 MPL-2.0 协议头

### 10.5 阶段二交付物清单（M8 完成时）

- [ ] 模拟器全部用 TypeScript 重写，拆分为 6 个模块
- [ ] 无全局变量污染，状态封装为 `EmulatorContext` class
- [ ] 黄金基准测试集全部通过（判定 bit-for-bit 一致）
- [ ] 性能不劣于阶段一（60fps 达标）
- [ ] 封装版代码已清理删除
- [ ] 类型安全（strict mode 通过）

---

## 11. 后期演进：模拟器 TypeScript 重写（阶段二）

> 本节描述阶段一（封装版）稳定达标之后的后续工作。**阶段一交付物不包含本节内容**，但架构设计需为阶段二留好接口，避免重写时推倒重来。

### 11.1 为什么要后期重写
阶段一采用"原样封装"策略，是为了尽快跑通全流程、保留原版调好的性能。但封装版存在固有缺陷：
- ❌ 2366 行 JS 无类型，重构时易出错
- ❌ 大量全局变量（Renderer / chartLine / mouse / touch / keyboard 等 40+ 个），污染组件作用域
- ❌ 命令式风格与 React 声明式范式割裂，维护成本高
- ❌ 无法 Tree-shaking，死代码（如已注释的 loadFile）难彻底清理
- ❌ 难以单元测试（判定逻辑、谱面解析散落在闭包里）

阶段二用 TypeScript 从零重写，解决以上问题，获得工程化收益。

### 11.2 重写前提（必须满足才能启动阶段二）
1. ✅ 阶段一已交付且 §8 验收清单全部通过
2. ✅ 性能基准达标（60fps / 音画同步 ≤±30ms / 判定窗口 1:1）
3. ✅ 已用阶段一版本录制**黄金基准测试集**（见 11.4），作为重写后的回归对照
4. ✅ 谱面解析（chart123/chartp23）已提取为纯函数模块（A-5 已完成），可直接复用

### 11.3 重写范围与目标架构

| 模块 | 阶段一（封装） | 阶段二（TS 重写） |
|------|--------------|------------------|
| `script.phigros.emulator.ts` | 原版 JS 原样 + 最小改造 | 拆分为多个 TS 模块：`renderer.ts` / `judgement.ts` / `audio-engine.ts` / `input-handler.ts` / `stat.ts` / `timer.ts` |
| `index.ts`（资源加载） | 原版逻辑 + fetch 改造 | 合并到 `emulator-loader.ts`，类型化资源管理 |
| 全局变量 | 闭包 / useRef 持有 | `EmulatorContext` class 实例，所有状态为实例字段 |
| 事件绑定 | 直接绑 Canvas DOM | 同左（性能要求，不走 React 合成事件），但用类型化 handler |
| 渲染循环 | 原版 RAF + 双 Canvas | 同左（性能要求不变），但 drawNote/drawLine 等函数类型化 |

### 11.4 黄金基准测试集（重写前必须准备）
为防止重写引入行为偏差，阶段一稳定后需录制基准数据：
- **谱面回归集**：选 3 个代表性谱面（sample JSON / samplePec PEC / ouroVoros PEC），用固定时间戳序列回放
- **判定快照**：对每个谱面，以 autoplay 模式（临时启用）跑完，记录每个 note 的判定结果（status / 时间戳 / combo / score）
- **帧截图**：关键帧（开头 / 中段 / 结尾过渡 / 结算）的 canvas 截图
- **音画时序**：bgm startTime 与首个 note 判定时间的差值

重写后对同一谱面回放，比对判定快照与帧截图，**完全一致才算通过**。

### 11.5 重写策略（增量替换，不推倒）
1. **先抽类型**：从原版 JS 提取 `types.ts`（Note / Event / Judgement / Stat / Chart 等），阶段一已部分完成
2. **逐模块替换**：按 `timer.ts` → `stat.ts` → `judgement.ts` → `audio-engine.ts` → `input-handler.ts` → `renderer.ts` 顺序，每替一个模块跑一次黄金基准
3. **保留封装版作回退**：重写期间两套实现并存（环境变量切换），重写模块全部通过基准后才删封装版
4. **绝不改判定数值**：判定窗口（Perfect ±80ms / Good ±160ms / HyperMode ±120ms）、分数公式、phi 编码，重写前后必须 bit-for-bit 一致

### 11.6 阶段二预估工时
| 任务 | 工时 |
|------|------|
| 黄金基准测试集录制 | 6h |
| types.ts 完善 | 4h |
| timer / stat / judgement 重写 | 16h |
| audio-engine 重写 | 8h |
| input-handler 重写 | 6h |
| renderer 重写（最大块） | 24h |
| 逐模块基准回归 | 12h |
| 性能调优（对标阶段一 60fps） | 8h |
| 删除封装版 + 清理 | 2h |
| **合计** | **~86h** |

阶段二独立于阶段一排期，不阻塞阶段一交付。

---

## 12. 总结

本计划采用**分两阶段演进**策略：

**阶段一（当下，方案二·封装）**：外围 8 个页面用 Next.js + React + shadcn/ui 重写，核心模拟器原样封装为 client 组件。约 74 小时（全职 2 周）。

**阶段二（后期，方案一·TS 重写）**：模拟器用 TypeScript 从零重写，以阶段一为行为基准逐模块对齐。约 86 小时，独立排期不阻塞阶段一。

**版权定位**：Phi.ts 与《Phigros》商业游戏无代码关系（仅仿制玩法），参考开源项目 phigros-html5（MPL-2.0）完全合法，承诺非商业永久免费开源，terrasphere 谱面直接删除。

**核心权衡**：
- ✅ 阶段一快速跑通全流程，保留原版调好的性能与判定
- ✅ 享受 Next.js 工程化（路由、API、TS、shadcn/ui）
- ✅ 数据向后兼容（localStorage + URL 参数）
- ✅ 阶段二渐进式重写，有黄金基准保底，不怕行为漂移
- ⚠️ 阶段一模拟器代码风格与 React 不一致（封装在组件内，不影响外围）
- ⚠️ 阶段一需处理全局变量与 React 生命周期的协调（C-1 重点）

**完成标准**：§8 验收检查清单全部打勾 + Agent Browser 自检通过 + 性能基准达标。阶段二在阶段一完成后另行启动。
