# Phigros HTML5 模拟器迁移分析工作日志

## 任务 analysis-1（whilePlaying 目录深度分析）

**执行 Agent**: Explore
**分析目录**: `/home/z/my-project/phigros-html5/whilePlaying/`
**目标**: 完全理解核心游玩模拟器实现，为迁移到 Next.js client 组件做准备

### 已读文件
- `index.html` (168 行) - 入口 HTML，声明 canvas、pauseOverlay、隐藏配置面板
- `style.css` (168 行) - 引入字体、布局、暂停遮罩样式
- `index.js` (302 行) - DOMContentLoaded 加载谱面/曲绘/音乐，应用 localStorage 设置，监听 btn-play
- `script.phigros.emulator.js` (2366 行) - 核心模拟器：Canvas 渲染循环、判定、音频、谱面解析（JSON/PEC）、暂停、结算
- `assets/stackblur.min.js` (1 行 minified) - StackBlur 库，提供 `StackBlur.imageDataRGB`
- `assets/createImageBitmap.js` (polyfill，HTML 中已注释掉，依赖原生)
- `assets/oggmented-bundle.js` (minified) - Safari 兼容 OGG 解码，提供 `oggmented.OggmentedAudioContext`
- `assets/fonts/fonts.css` - 注册 `Phigros` 和 `Mina` 两个字体族
- `charts/sample/meta.json` - 元数据示例
- `charts/sample/line.json` - 判定线贴图配置示例
- `LevelOver/index.js` - 结算页 URL 参数读取（确认参数名）

### 关键发现摘要
- **双 Canvas 渲染**：`canvas`（可见）+ `canvasos`（离屏，游戏内坐标系），`loop()` 通过 requestAnimationFrame 驱动
- **双脚本共享全局**：emulator 与 index.js 都在全局作用域，且都重复 `var Renderer`/`var chartLine, chartLineData`；index.js 把数据写入 `window.Renderer.*`，emulator 直接读 `Renderer.*`
- **谱面双格式支持**：JSON（formatVersion 1/3/3473）和 PEC（文本格式）共用统一内部数据结构，由 `chart123()` 升级版本、`chartp23()` 解析 PEC
- **判定窗口**：Tap 判定区间 ±0.16s（HyperMode ±0.12s），细分 PM/PE/PL/GE/GL/Bad 共 7 种 status
- **音频同步**：使用 wall-clock（`Date.now()`）+ `curTimestamp` + `curTime` 重新计算 `timeBgm`，暂停时记录 `curTime = timeBgm`，恢复时 `playBgm(bgm, timeBgm)` 从偏移处继续
- **资源就绪检测**：`setInterval` 轮询 Renderer 12 个字段非空 且 `window.ResourcesLoad==200`
- **结算数据传递**：通过 URL 参数（play/l/score/mc/p/g/b/e/m/c）跳转到 `../LevelOver/index.html`
- **本地存储**：`localStorage.phi`（最佳成绩，40字符一段：32字符md5+8字符数据，乱序拼接）；其他键映射到表单元素 ID 用于设置持久化
- **潜在 Bug**：`qwqdraw2()` 中 LevelOver 音频路径为 `src/LevelOver${difficulty}${_v2?}.ogg`，但实际文件在 `assets/` 目录下（路径不匹配，会导致 404）

### 迁移到 Next.js 注意事项
1. 整个 emulator + index.js 高度耦合于全局作用域，迁移时建议整体封装为一个 client 组件，在 `useEffect` 中执行
2. 必须保留 HTML 中所有 `id` 元素（包括 `.hide` 的隐藏配置面板），代码通过 `getElementById` 访问
3. 三个外部库必须按顺序加载：`oggmented-bundle.js` → `zip.min.js`（CDN，可选）→ `stackblur.min.js`
4. 资源路径需保留：`assets/`（运行时资源）、`../charts/{codename}/`（谱面）、`../assets/fonts/`（字体）、`../assets/audio/`（UI 音效）
5. 跨页面导航用 `location.href` 相对路径，建议在 Next.js 中保留相对路径或改用 `router.push`
6. 依赖原生 API：`AudioContext`/`webkitAudioContext`、`createImageBitmap`、`requestAnimationFrame`、`ImageBitmap`、`fetch`、`XHR`、`Blob`、`URLSearchParams`

详细报告见对话回复。

---

## 任务 analysis-2（外围页面与资源结构深度分析）

**执行 Agent**: Explore
**分析目录**: `/home/z/my-project/phigros-html5/`（除 whilePlaying 外的所有外围页面 + charts + assets + PWA/SW）
**目标**: 完全理解入口、tapToStart、loadingScreen、loadingChartScreen、chapterSelect、songSelect、LevelOver、settings、aboutUs、charts、assets、PWA、Service Worker 的结构、跳转、资源与状态，为迁移到 Next.js 做准备

### 已读文件清单
- 根目录: `index.html`(64行) `index.js`(78行) `constants.js`(6行) `sw.js`(52行) `manifest.webmanifest`(21行) `CNAME` `Readme.MD` `LICENSE` `favicon.ico`
- `tapToStart/`: `index.html` `index.js`(43行) `style.css`(93行) `TouchToStart0.mp3`
- `loadingScreen/`: `index.html` `index.js`(10行) `style.css`(54行)
- `loadingChartScreen/`: `index.html`(57行) `style.css`(195行)
- `chapterSelect/`: `index.html`(57行) `index.js`(33行) `style.css`(169行) `ChapterSelect0.mp3`
- `songSelect/`: `index.html`(49行) `index.js`(184行) `SongList.js`(136行) `style.css`(456行) `play.png`
- `LevelOver/`: `index.html`(57行) `index.js`(129行) `style.css`(353行)
- `settings/`: `index.html`(82行) `index.js`(135行) `style.css`(177行)
- `aboutUs/`: `index.html`(1061行) `main.html`(1025行) `main.js`(57行) `index.css`(58行) `main.css`(81行) `AboutUs0.mp3` `AboutUs1.mp3` `snr.png`
- `charts/`: `single.json` `How-To-Contribute.MD`、4 个谱面包：`sample/`(SpasmodicSP, JSON 格式)、`samplePec/`(Tempestissimo, PEC 格式)、`ouroVoros/`(PEC 格式)、`terrasphere/`(PEC 格式，已禁用，meta.json 改名为 `meta.blocked.json`)
- `assets/`: `tips.json`(52 条 tip) `autoScale.js`(10行) `fonts/fonts.css` + 20 个字体文件（Exo 全套 + Source Han Sans & Saira Hybrid + 站酷文艺体 + Arial） `audio/`(Tap1-7.wav + LevelOver0-3.wav + desktop.ini) `images/`(41 个文件，含 chapterImages 子目录 15 张章节图)

### 关键发现摘要

#### 1. 入口与跳转
- **`/index.html` 不是入口页**：只是一个介绍/许可/A2HS 安装引导页。`start_url` 指向 `/tapToStart/index.html`，PWA 直接跳过此页
- **`index.js` 唯一职责**：① 注册 SW；② 监听 `beforeinstallprompt` 实现"添加到桌面"按钮；③ 提供"手动缓存资源"按钮，与 SW install 共用同一个资源清单（约 30 个文件，全在 `video-store` cache）
- **真实入口是 `tapToStart/index.html`**：背景模糊图 + 漂浮粒子动画 + `audio#audio` 循环播放 `TouchToStart0.mp3`
  - `DOMContentLoaded` 后立即 `audio.play()`，每 2s 生成一个气泡 div，11.95s 后清除
  - 任意点击触发：插入 `div.fadeIn` 全屏黑遮罩 + 0.6s fadeIn + 每 10ms 把音量 -0.1 渐弱
  - 510ms 后跳转：`localStorage.length==0` → `../settings/index.html`（首次启动）；否则 → `../chapterSelect/index.html`

#### 2. 章节选择（chapterSelect）
- HTML 只有 1 个启用章节 `<div class="chapterContainer" data-name="单曲 精选集" data-codename="single">`，其余 12 个章节全部注释掉
- JS：监听 `wheel` 修改 `document.body.style.left` 实现水平滚动（带左右边界检测）
- 点击章节：播放 `Tap1.wav`、给 `div.darkOverlay` 加 `fadeIn` 类、400ms 后 `location.href='../songSelect/index.html?c='+data-codename`
- 右下角设置按钮直接 `location.href='../settings/index.html'`
- 背景音乐 `<audio autoplay loop>` 自动播放 `ChapterSelect0.mp3`
- CSS：`transform: skew(-15deg)` 倾斜切变是 Phigros UI 视觉风格的核心，全项目通用

#### 3. 歌曲选择（songSelect + SongList.js）
- 入口参数：`?c={chapterCodeName}` → XHR 同步获取 `../charts/{c}.json`（如 `single.json` = `["sample","samplePec","ouroVoros"]`）
- 对每首歌再 XHR 同步获取 `../charts/{codename}/meta.json`，存入 `window.songMetaList`
- SongList.js 是组件化实现（factory pattern）：
  - `SongList()` 返回 `{element, items, createSong, switchSong, switchLevel}`
  - `SongContainer` 包含 `SongItem`（歌名+曲师）+ `SongLevel`（难度数字）
  - 选中时：fetch blob → `URL.createObjectURL` 设置背景图和 illustration `<img>`；设置 `audio#slicedAudioElement.src` 为 `../charts/{codename}/{musicFile}`；从 `sliceAudioStart` 开始播放，每 15s 循环切片
  - 难度切换：4 个 `levelItem`（ez/hd/in/at）带 fade 动画，选中色：ez 绿 #51af44、hd 蓝 #3173b3、in 红 #be2d23、at 黑 #3a3637
- 右下角 `div.playBtn` 点击 `readyToLoadTrigger()`：插入滑入遮罩动画（2s cubic-bezier）+ 播放 `Tap7.wav` + 2s 后 `location.href='../whilePlaying/index.html?play={codename}&l={level}&c={chapter}'`
- 桌面端滚轮 + 移动端 touch 实现歌曲列表纵向滚动
- 右侧 illustration 区域带 `transform: skew(-15deg) scale(...)` 动态缩放（基于 innerHeight/devicePixelRatio）

#### 4. 加载页（loadingScreen + loadingChartScreen）
- **`loadingScreen/index.html` 实际未被任何页面跳转引用**（孤儿页面），但其 `index.js` 被 `loadingChartScreen` 通过 `<script src="../loadingScreen/index.js">` 引入，用于显示 tip
- `loadingScreen/index.js`：XHR 同步 GET `../assets/tips.json`（52 条 tip）随机选一条塞进 `#tipConteiner`
- **`loadingChartScreen` 不是独立跳转页面**：`whilePlaying/index.js` 通过创建 `<iframe src="../loadingChartScreen/index.html?c={play}&l={level}">` 嵌入作为加载遮罩
- `loadingChartScreen` 内联 module 脚本：解析 URL 参数 → XHR `../charts/{c}/meta.json` → 填充 `#songNameElem`/`#artistElem`/`#chartDesignerElem`/`#illustratorElem`/`#songImgElem`/`#levelInfoElem`；body 背景设为曲绘
- whilePlaying 轮询 `Renderer` 12 个字段全部非空 且 `window.ResourcesLoad==200` 后移除 iframe
- CSS：加载条用 `loadingBarBGAnim`（白块从 -100% 到 200% 平移）+ `loadingBarTXTAnim`（文字黑白闪烁）1s 无限循环

#### 5. 结算页（LevelOver）
- 入口参数（全部 URL query）：`play`/`l`/`score`/`mc`/`p`/`g`/`b`/`m`/`e`/`c`
- 计算 `accuracy = round((p+g*0.65)/(p+g+b+m)*10000)/100`、`late = good - early`
- 评级逻辑（萌娘百科规则）：
  - `score==0` → 无评级
  - `<700000` → F (`F15F.png`)
  - `700000-819999` → C (`C15C.png`)
  - `820000-879999` → B (`B15B.png`)
  - `880000-919999` → A (`A15A.png`)
  - `920000-959999` → S (`S15S.png`)
  - `960000-999999` → V (`V15V.png`)；若 `good==0 && bad==0 && miss==0` → `V15FC.png`（Full Combo）
  - `>=1000000` → Phi (`phi15phi.png`)
- 播放 `../assets/audio/LevelOver{levelIndex}.wav`（0/1/2/3 对应 ez/hd/in/at）
- 背景设为曲绘 + `backdrop-filter: blur(100px)`，左半部分展示曲绘+歌名+难度，右半部分展示分数+评级图+MaxCombo+Accuracy+Perfect/Good/Bad/Miss+Early/Late
- RKS 计算：`accuracy>=70 ? pow((accuracy-55)/45, 2) * {levelRanking} : 0`（ΔRKS，未持久化）
- `retryBtn` → `../whilePlaying/index.html?play={play}&l={l}&c={c}`（重玩）
- `backBtn` → `../songSelect/index.html?c={c}`（回选歌）
- 缩放：`document.body.children[0].style.transform="scale("+innerHeight/480/devicePixelRatio+")"`，`window.onresize` 重新计算
- 动画：`mainContent` slideIn+slide、`scoreFrame`/`atAGlance`/`detailFrame` 分阶段 slideIn，`extraInfo`（RKS）有 2s `extract` 展开动画

#### 6. 设置页（settings）
- 11 个设置项（5 个 slider + 6 个 toggle + 2 个按钮）：
  - `input-offset`（谱面延时 MS，slider，total=1000，初始 0）
  - `select-scale-ratio`（按键缩放，slider，total=5，初始 3）
  - `select-global-alpha`（背景亮度，slider，total=5，初始 3）
  - `hitSong`（打击音效，toggle，初始 checked）
  - `highLight`（多押辅助，toggle，初始 checked）
  - `autoFullscreen`（自动全屏，toggle，初始 checked）
  - `lineColor`（FC/AP 指示器，toggle，初始 unchecked）
  - `hyperMode`（HyperMode，toggle，初始 unchecked）
  - `imageBlur`（背景模糊，toggle，初始 checked）
  - `feedback`（触摸反馈，toggle，初始 unchecked）
  - `showPoint`（定位点，toggle，初始 unchecked）
- localStorage 键名 = `data-codename` 属性值；toggle 存 `"true"`/`"false"` 字符串；slider 存数字字符串
- `loadSettings()` 在 `DOMContentLoaded` 调用，从 localStorage 恢复状态；`saveSettings()` 在 `backBtn` 点击时调用（虽然 click 监听器已经在交互时即时保存，这里是兜底）
- `backBtn` → `saveSettings()` + `location.href='../chapterSelect/index.html'`
- "关于我们" 按钮 → `../aboutUs/index.html`
- "清除全部数据" 按钮 → `window.localStorage.clear()` + `../index.html`
- 滚动逻辑：桌面 wheel / 移动 touch 修改 `#settingItems` 的 `margin-top`

#### 7. 关于页（aboutUs）
- **双阶段 SPA**：`index.html` 初始展示 `index.css` 风格的 tap-to-start 覆盖层（与 tapToStart 视觉一致），内嵌 `<div id="main" class="hide">` 包含完整 credits 内容
- 点击 body：把 `link#indexCSS.href` 切换为 `./main.css`、移除 phigrosLogo 和 tapToStart、移除 `#main.hide` 的 hide 类、动态注入 `main.js`、`script.onload` 后调用 `autoScroll()`
- `autoScroll()`：播放 `AboutUs0.mp3`，`ended` 事件后切换到 `AboutUs1.mp3` 来回循环；`setInterval(12ms)` 每次把 `body.style.marginTop -= 0.5px` 实现缓慢上滚；滚到底部后 3s 渐显 `blackOverlay`，再 1s 后跳转 `../chapterSelect/index.html`
- 跳过机制：5s 内连点 6 次 → 直接渐显 blackOverlay + 1s 后跳转
- 内容结构（1061 行静态 HTML）：
  - 2 个 `<pre class="fromGameDirector">`：HanHan233 写在前面 + Soullies 原作感言
  - 1 个 `<pre class="credits">`：Pigeon Games 全体成员名单（程序/谱师/美术/音乐/剧情/客服/宣传/UI/翻译组）
  - `<img src="./snr.png">`（SOUL NOTES RECORDS logo，406x99）
  - 1 个 `<pre class="musicCredits">`：内含 `<div class="mainContent">` 分 `leftSide`+`rightSide` 两列展示所有曲目 credits
  - `<div class="thanksAllHelpers">` + `<div class="thankYou">`
- `main.html` 是 standalone 版本（与 index.html 内容几乎一致，但默认就加载 main.css + main.js，无 tap-to-start 阶段，似乎是开发预览用，未在跳转流中使用）

#### 8. charts 谱面结构
**目录约定**（见 `How-To-Contribute.MD`）：
- `charts/{chapterCodeName}.json`：章节内歌曲 codename 数组（如 `single.json`）
- `charts/{songCodeName}/meta.json`：歌曲元数据，必须字段：
  - `name`/`codename`/`artist`/`musicFile`/`illustration`/`chartDesigner`/`illustrator`/`sliceAudioStart`
  - `ezRanking`/`hdRanking`/`inRanking`/`atRanking`（定数，可带小数）
  - `chartEZ`/`chartHD`/`chartIN`/`chartAT`/`chartLegacy`（谱面文件名，可重复）
  - 可选 `lineTexture`（判定线贴图配置）
- 谱面双格式：
  - **JSON 格式**（formatVersion 3）：`{formatVersion, offset, numOfNotes, judgeLineList:[{speedEvents, judgeLineMoveEvents, ...notesAbove/notesBelow}]}`，由 `chart123()` 处理
  - **PEC 格式**（文本）：`-80` `bp 0.000 231.000` `n1 0 5.000 320.000 1 0` 等，由 `chartp23()` 处理
- 4 个谱面包：
  - `sample/`：SpasmodicSP（JSON，837KB）+ 4 张判定线贴图（0.png 是 1x1 透明占位）+ line.json + line.copy.json（带中文说明）
  - `samplePec/`：Tempestissimo（PEC，220KB）+ temp.jpg + temp.mp3
  - `ouroVoros/`：ouroVoros（PEC，180KB）+ jpg + ogg
  - `terrasphere/`：Terrasphere（PEC，159KB）+ jpg + mp3 — **已禁用**：`meta.json` 被改名为 `meta.blocked.json`，所以 fetch 会 404，无法选曲；同时在 sw.js 和 index.js 的缓存清单中被注释掉

#### 9. assets 资源结构
- `assets/fonts/fonts.css`：注册 `Phigros` 和 `Mina` 两个 font-family，都使用 `Exo-Regular.otf` + `Source Han Sans & Saira Hybrid-Regular.ttf`；`* { font-family: Phigros }` 全局应用
- 字体文件共 20 个：Exo 全套（Thin/Light/Regular/Medium/DemiBold/Bold/ExtraBold/Black + 各 Italic 变体）、Arial.ttf、站酷文艺体.ttf、Source Han Sans & Saira Hybrid-Regular.ttf（含 #958 副本）
- `assets/audio/`：Tap1.wav-Tap7.wav（7 个 UI 点击音）+ LevelOver0.wav-LevelOver3.wav（4 个结算音乐，对应 4 个难度）+ `desktop.ini`（Windows 文件夹元数据，应忽略）
- `assets/images/`：
  - 评级图：`F15F.png` `C15C.png` `B15B.png` `A15A.png` `S15S.png` `V15V.png` `V15FC.png` `phi15phi.png`（结算页用）
  - UI 图标：`back.png` `backInResault.png` `Retry.png` `setting.png` `sort.png` `play.png`(在 songSelect 目录) `Button_Left.png` `Button_Right.png`
  - 背景/Logo：`InitialBackground.png`（全项目默认背景）`Phigros.png`（logo）`Introduction.png` `bb.png` `φ.png`
  - PWA 图标：`app_icon.png`(192x192) `app_icon_576x576.png`(512x512)
  - 击键素材（SVG）：`Tap.svg` `HoldHead.svg` `HoldBody.svg` `Drag.svg` `Flick.svg` + `hitKeys.sketch`（设计源文件）
  - `chapterImages/`：15 张章节封面（Single、MainStory4-7、MainStory6Locked、MainStory7Locked、MainStoryLegacy、SideStory1、KALPA、MUSEDASH、WAVEAT、Good、HyuN、RST），但只有 Single.png 在用
- `assets/tips.json`：52 条 tip 字符串数组，loadingScreen/loadingChartScreen 随机选一条显示
- `assets/autoScale.js`：通用缩放工具，监听 DOMContentLoaded/resize 把 `document.body.children[0]` 按 `outerHeight/480` 缩放（在 loadingChartScreen 中已注释掉，LevelOver 自己实现了类似逻辑）

#### 10. PWA 与 Service Worker
**manifest.webmanifest**:
- `name: "Phigros HTML5 Edition"`、`short_name: "Phigros"`
- `background_color: #ada5dc`、`display: fullscreen`、`orientation: landscape`
- `start_url: /tapToStart/index.html`（PWA 启动直接进 tapToStart，绕过 index.html）
- `icons`: 192x192 + 512x512
- 仅在 `index.html` 通过 `<link rel="manifest">` 引入

**sw.js**:
- Cache name: `"video-store"`
- `install` 事件：`cache.addAll` 预缓存约 30 个文件（音频/谱面/章节图），HTML/CSS/JS/字体都不预缓存
- `fetch` 事件：**cache-first 策略**（`caches.match` 命中则返回，否则 `fetch` 兜底，但**不动态写入缓存**）
- **无 `activate` 事件**、**无版本管理**、**无 cache 清理**：更新资源需要用户手动清缓存（README 和 index.html 都明确提示"清浏览器缓存"）
- **仅由 `index.js` 注册**：PWA 直接从 tapToStart 启动时 SW 不会注册（除非用户先访问过 index.html）
- `index.js` 还提供"缓存资源"按钮，调用 `caches.open("video-store").addAll([...])` 执行与 SW install 相同的清单

### 完整路由流程图

```
[浏览器访问 /]
   ↓
[index.html] 介绍页 + A2HS 按钮 + 缓存按钮（注册 SW）
   ↓ 用户点击 <a href="../tapToStart/index.html"> 或 PWA 启动
[tapToStart/index.html] 漂浮粒子 + 循环音乐
   ↓ 任意点击 → fadeIn 510ms
   ├─ localStorage.length==0 → [settings/index.html]（首次）
   └─ 否则 → [chapterSelect/index.html]
              ↓ 点击章节（目前只有 single）→ 400ms darkOverlay
              [songSelect/index.html?c=single]
                ├─ backBtn → chapterSelect
                ├─ settingBtn → settings
                ├─ 切歌/切难度（fetch blob 设置背景、切片音频循环）
                └─ playBtn → readyToLoadTrigger → 2s slideIn 遮罩
                   [whilePlaying/index.html?play={codename}&l={level}&c={chapter}]
                     ├─ 内部创建 iframe: loadingChartScreen?c=...&l=...
                     │   └─ loadingScreen/index.js 显示随机 tip
                     ├─ 轮询 Renderer 12 字段 + ResourcesLoad==200 → 移除 iframe
                     ├─ 游戏中 backBtn → songSelect?c=...
                     └─ 结束 → script.phigros.emulator.js 跳转：
                        [LevelOver/index.html?play=...&l=...&score=...&mc=...&p=...&g=...&b=...&m=...&e=...&c=...]
                          ├─ retryBtn → whilePlaying?play=...&l=...&c=...（重玩）
                          └─ backBtn → songSelect?c=...（回选歌）

[settings/index.html]（任意页面可进）
   ├─ backBtn → saveSettings() → chapterSelect
   ├─ "关于我们" → [aboutUs/index.html]
   │     ↓ tap-to-start 阶段 → 点击 → 切到 main.css + main.js
   │     ↓ autoScroll 自动滚动 credits + 双音乐循环
   │     ↓ 滚到底 / 5s 内点 6 次 → chapterSelect
   └─ "清除全部数据" → localStorage.clear() → index.html
```

### localStorage 键清单
| Key | 类型 | 写入处 | 读取处 | 含义 |
|-----|------|--------|--------|------|
| `input-offset` | 数字字符串 | settings | whilePlaying | 谱面延时 MS |
| `select-scale-ratio` | 数字字符串 | settings | whilePlaying | 按键缩放 |
| `select-global-alpha` | 数字字符串 | settings | whilePlaying | 背景亮度 |
| `hitSong` | `"true"`/`"false"` | settings | whilePlaying | 打击音效开关 |
| `highLight` | 同上 | settings | whilePlaying | 多押辅助开关 |
| `autoFullscreen` | 同上 | settings | whilePlaying | 自动全屏开关 |
| `lineColor` | 同上 | settings | whilePlaying | FC/AP 指示器开关 |
| `hyperMode` | 同上 | settings | whilePlaying | HyperMode 开关 |
| `imageBlur` | 同上 | settings | whilePlaying | 背景模糊开关 |
| `feedback` | 同上 | settings | whilePlaying | 触摸反馈开关 |
| `showPoint` | 同上 | settings | whilePlaying | 定位点开关 |
| `phi` | 40 字符乱序字符串 | whilePlaying | whilePlaying | 最佳成绩（每首歌 32+8 字符）|

注：tapToStart 用 `window.localStorage.length==0` 判断"首次启动"——这意味着只要 whilePlaying 写过 `phi`，就不会再进 settings，即使所有 settings 项未设置也用默认值。

### URL 参数约定
| 来源 → 目标 | 参数 |
|------------|------|
| chapterSelect → songSelect | `c={chapter}` |
| songSelect → whilePlaying | `play={song}` `l={level}` `c={chapter}` |
| whilePlaying → loadingChartScreen (iframe) | `c={song}` `l={level}` |
| whilePlaying → LevelOver | `play` `l` `score` `mc` `p` `g` `b` `m` `e` `c` |
| LevelOver → whilePlaying (retry) | `play` `l` `c` |
| LevelOver → songSelect (back) | `c` |

### 迁移到 Next.js 注意事项
1. **路由改造**：6 个外围页面 + whilePlaying 都用相对路径 `location.href`，Next.js App Router 建议改为 `router.push('/tap-to-start')` 等；URL query 参数语义不变
2. **HTML 入口废弃**：`index.html` 改为 Next.js 首页（保留 A2HS 引导 + 缓存按钮 + 更新日志）；PWA `start_url` 仍指向 tapToStart
3. **PWA 集成**：使用 `next-pwa` 或 Next.js 13+ 原生 PWA 支持；manifest 移到 `public/manifest.webmanifest`，在 root layout 注入；SW 用 Workbox 替代手写 sw.js，预缓存清单迁移到 Workbox 配置
4. **资源路径**：所有 `../assets/...`、`../charts/...`、`../audio/...` 在 Next.js 中改为 `/assets/...`、`/charts/...`、`/audio/...`（放 `public/` 目录）
5. **同步 XHR**：loadingScreen/loadingChartScreen/songSelect/LevelOver 大量使用 `XHR.open(..., false)` 同步请求，Next.js 中应改为 `fetch` + `await`，避免阻塞渲染
6. **iframe 加载遮罩**：whilePlaying 用 iframe 嵌入 loadingChartScreen 的设计可直接合并为同组件内的 loading overlay 状态
7. **CSS skew 风格**：所有页面都用 `transform: skew(-15deg)` + 子元素 `skew(15deg)` 还原的视觉风格，迁移时保留为共享 utility class（如 `.phigros-skew`）
8. **fonts.css 全局 `* { font-family: Phigros }`**：迁移时改为 Next.js `globals.css` 中的 `body { font-family: 'Phigros', ... }` 避免性能问题
9. **`autoScale.js` 与各页面自己的 resize 逻辑**：建议封装为 `useAutoScale` hook 统一处理
10. **aboutUs 双阶段 SPA**：可拆为两个 Next.js 页面（`/about-us` 入口 + `/about-us/credits` 滚动页）或单页组件状态切换；main.html 可废弃
11. **localStorage 键名**：保留原 codename 命名（`input-offset` 等）以便向后兼容老用户数据；建议封装 `useSettings` hook 替代手动 DOM 操作
12. **桌面/移动端输入**：chapterSelect/songSelect/settings 的 wheel/touch 滚动逻辑可统一改为 `overflow-y: auto` + CSS scroll-snap，或保留为 hook
13. **terrasphere 谱面**：被禁用（`meta.blocked.json`），迁移时若需恢复只需重命名；sw.js/index.js 的缓存清单也已注释
14. **ChapterSelect 13 个章节注释**：迁移时若要扩展，取消注释对应的 `chapterContainer` div 即可，但需要补充对应 `charts/{codename}.json` 章节文件
15. **`phi` localStorage 加密**：whilePlaying 用 32 字符 md5 + 8 字符数据 + 随机乱序拼接，迁移时若重写最佳成绩存储，建议改为 JSON + Base64，但需考虑老数据迁移

详细报告见对话回复。

---

## 任务 A-2+A-3（全局样式 / 字体 / PWA SW / layout 改造）

**执行 Agent**: Code (M1 基础设施)
**目标**: 创建 Phi.ts 项目的全局样式、字体、PWA Service Worker，并改造 layout.tsx，作为 M1 基础设施的一部分

### 创建/修改的文件

1. **`src/styles/phigros.css`** (新建) — 全局 Phigros 样式
   - `@font-face` 注册 `Phigros` 和 `Mina` 两个字体族，路径改为绝对路径 `/phigros/assets/fonts/...`
   - 全局重置：`* { font-family: 'Phigros', 'Mina', sans-serif; }`
   - `html, body`：`overflow: hidden`、`background: #000`、`user-select: none`、`touch-action: none`、`margin/padding: 0`、`-webkit-user-select: none`（覆盖 globals.css 中的 body 规则，因为 phigros.css 在其后导入）
   - 倾斜工具类：`.phigros-skew { transform: skew(-15deg); }` + `.phigros-skew-revert { transform: skew(15deg); }`
   - 动画关键帧（8 个，源自原版各页面 CSS）：
     - `fadeIn` — opacity 0→1（tapToStart 黑色遮罩渐入）
     - `float` — translateY 0→-100vh + opacity 脉冲（tapToStart 气泡上浮）
     - `loadingBarBGAnim` — left -100%→200%（loadingScreen 白块平移）
     - `loadingBarTXTAnim` — color #000→#fff→#000（loadingScreen 文字闪烁）
     - `slideIn` — translateX 100%→0（songSelect readyToLoadOverlay 从右滑入）
     - `scaleDown` — scale 2→1（LevelOver gradeImage 缩小）
     - `extract` — width 0→200px + opacity 0→1（LevelOver extraInfo RKS 展开）
     - `slideAndFadeIn` — margin-top 150px→80px + opacity（loadingChartScreen 渐入）
   - 工具类：`.fade`（opacity transition）/ `.hide`+`.hidden`（display:none）/ `.darkOverlay`（全屏黑色遮罩，opacity:0 + pointer-events:none）/ `.darkOverlay.fadeIn`（显示态 opacity:1 + pointer-events:auto）

2. **`public/sw.js`** (新建) — Service Worker
   - `CACHE_NAME = 'phigros-video-store-v1'`（带版本号，便于后续激活清理）
   - `PRECACHE_URLS`：30 个文件，全部加 `/phigros/` 前缀（原版无前缀）；包含 tapToStart/chapterSelect BGM、Single 章节图、LevelOver0-3.wav + Tap1-7.wav、ouroVoros/sample/samplePec 谱面包
   - **移除 terrasphere**：原版已禁用，新版彻底从清单中删除（不再保留注释）
   - `install` 事件：`cache.addAll(PRECACHE_URLS)` 预缓存（保留原版 cache-first 语义）
   - **`activate` 事件（新增 bug 修复）**：`caches.keys()` 遍历所有缓存键，删除非当前版本键 + `self.clients.claim()` 立即接管页面（原版无 activate 事件，导致更新资源需用户手动清缓存）
   - `fetch` 事件：cache-first 策略 `caches.match(e.request).then(r => r || fetch(e.request))`（保留原版行为，不动态写入缓存）

3. **`src/components/phigros/PhigrosProvider.tsx`** (新建) — 客户端 Provider
   - `'use client'` 指令
   - `useEffect` 中 `navigator.serviceWorker.register('/sw.js')`，catch 错误并 console.error
   - **修复原版 bug**：原版只在 `index.html` 注册 SW，PWA 从 tapToStart 直接启动时 SW 不生效；新版全局注册
   - 仅客户端执行，SSR 时跳过（useEffect 本身就是客户端 only）
   - 返回 `<>{children}</>` 透明包裹

4. **`src/app/layout.tsx`** (修改) — Root Layout 改造
   - 保留 `import "./globals.css"`，新增 `import "../styles/phigros.css"`（顺序：globals 先，phigros 后，让 phigros 的 body 规则覆盖 globals）
   - 保留 Geist / Geist_Mono 字体变量（shadcn/ui 主题依赖 `--font-geist-sans`/`--font-geist-mono`）
   - `metadata`：title=`"Phi.ts"`，description=`"A TypeScript Web edition of Phigros"`，manifest=`"/phigros/manifest.webmanifest"`，icons 数组（192x192 + 512x512 + apple 192x192）
   - `viewport`：`width: "device-width"`、`initialScale: 1.0`、`maximumScale: 1.0`、`userScalable: false`（Next.js 16 Metadata API 的 Viewport 类型）
   - 保留 `<Toaster />`
   - `<body>` 内用 `<PhigrosProvider>{children}</PhigrosProvider>` 包裹

5. **`public/phigros/manifest.webmanifest`** (修改) — PWA manifest
   - `name`: `"Phi.ts"`（原 `"Phigros HTML5 Edition"`）
   - `short_name`: `"Phi.ts"`（原 `"Phigros"`）
   - `start_url`: `"/tap-to-start"`（原 `"/tapToStart/index.html"`，改为 Next.js 路由）
   - `icons[].src`：加 `/phigros/` 前缀（`/phigros/assets/images/app_icon.png` + `/phigros/assets/images/app_icon_576x576.png`）
   - 保留 `background_color`/`display: fullscreen`/`orientation: landscape`
   - `description` 改为 `"A TypeScript Web edition of Phigros"`

6. **`eslint.config.mjs`** (修改) — ESLint 忽略列表
   - 新增 `phigros-html5/**`（原版 HTML5 legacy 源码，仅作分析参考，非项目代码）
   - 新增 `public/phigros/whilePlaying/assets/**/*.js`（vendored 压缩库：oggmented-bundle / stackblur / createImageBitmap polyfill）
   - 清理 lint 输出：原 218 个 errors/warnings 全部来自这两个目录，忽略后 `bun run lint` 干净通过

### 验证结果

- `bun run lint` ✅ 通过，无任何 error/warning
- `curl -sI http://localhost:3000/sw.js` → 200 OK
- `curl -sI http://localhost:3000/phigros/manifest.webmanifest` → 200 OK
- `curl -s http://localhost:3000/ | grep` → HTML `<head>` 包含 `Phi.ts`、`manifest`、`app_icon` 引用
- dev.log 显示 dev server 持续 200 响应，无编译错误

### 注意事项

- `phigros.css` 中 `html, body { overflow: hidden; touch-action: none; user-select: none; background: #000; }` 会全局生效，包括当前的默认首页 `src/app/page.tsx`（centered layout）。这是 Phigros 游戏的预期行为（全屏无滚动 UI），后续任务会替换 page.tsx 为 tapToStart 视图。
- 当前 `/tap-to-start` 路由尚未实现，manifest 的 `start_url` 已指向此路径，等 M2 阶段创建对应页面后即可正常跳转。
- `PhigrosProvider` 目前只做 SW 注册；后续可在此扩展 A2HS prompt 拦截、在线状态检测、全局音频上下文恢复（Safari 自动播放策略）等。
- `sw.js` 的 cache-first 策略不动态写入缓存（与原版一致），意味着首次访问未预缓存的资源时不会缓存；后续 M1/M2 阶段如需动态缓存可改为 stale-while-revalidate。

### 文件路径列表

新建：
- `/home/z/my-project/src/styles/phigros.css`
- `/home/z/my-project/public/sw.js`
- `/home/z/my-project/src/components/phigros/PhigrosProvider.tsx`

修改：
- `/home/z/my-project/src/app/layout.tsx`
- `/home/z/my-project/public/phigros/manifest.webmanifest`
- `/home/z/my-project/eslint.config.mjs`

---

## 任务 A-5（谱面解析器提取）

**执行 Agent**: Code (M1 基础设施)
**目标**: 从原版 phigros-html5 模拟器中提取谱面解析逻辑，封装为纯 TypeScript 函数模块，供 songSelect 预览校验和核心模拟器使用

### 创建的文件

1. **`src/lib/phigros/chart-parser.ts`** (新建, ~430 行) — 纯函数谱面解析器
   - 文件头部: MPL-2.0 协议头 + 原作者署名 (lchzh3473) + 1:1 移植说明
   - **类型定义** (文件顶部, 全部 export):
     - `Note` — `type: 1|2|3|4` (Tap/Drag/Hold/Flick) + 5 个数值字段
     - `SpeedEvent` — startTime/endTime/value/floorPosition
     - `LineEvent` — startTime/endTime + start/end + start2/end2 (6 字段)
     - `JudgeLine` — numOfNotes 系列 + bpm + 6 个事件/Note 数组
     - `Chart` — formatVersion/offset/numOfNotes/judgeLineList
   - **`chart123(chart: Chart): Chart`** (L73-L106) — JSON 谱面版本升级
     - 深拷贝 (`JSON.parse(JSON.stringify(chart))`)
     - switch 处理 formatVersion: case 1 升级到 3 (补 floorPosition, 拆 start2/end2), case 3/3473 直接放行, default 抛错
     - 保留原版 switch fallthrough 语义 (case 1 → case 3 → case 3473 break)
   - **`chartp23(pec: string, filename?: string): Chart`** (L108-L329) — PEC 格式解析
     - 内部三个 class (Chart/JudgeLine/Note) 1:1 移植，class 字段类型显式标注
     - 词法分析: `(pec.match(/[^\n\r ]+/g) || []).map(i => isNaN(i) ? String(i) : Number(i))`
     - 指令系统: bp/n1/n2/n3/n4/cv/cp/cd/ca/cm/cr/cf + `#` 和 `&` 修饰符 (fuckarr 变量名保留)
     - `pushCommand` 闭包内函数 (function 声明，hoisted) — 保留原样
     - `calcTime` 闭包内函数 (function 声明，hoisted) — PEC 时间→PGR 时间转换
     - motionType 缓动切片: 对 ldp/lmp/lrp 三个 Pec 事件数组按整秒切片, 用 tween[motionType] 计算每秒的 start/end 值
     - 所有 `message.sendWarning(...)` 替换为 `console.warn(...)`, 警告文案完全一致
     - 返回 `JSON.parse(JSON.stringify(qwqChart))` 深拷贝 (剥离 class 方法, 仅留数据)
   - **`tween`** (L331-L362) — 28 个缓动函数数组
     - 类型: `(((pos: number) => number) | null)[]` (索引 0-1 为 null, 2-29 为函数)
     - 所有 28 个箭头函数体 1:1 复制, 包括:
       - 索引 27: `pos => 1 - tween[26]!(1 - pos)` — 引用 tween[26]
       - 索引 28: `pos => (pos *= 2) < 1 ? tween[26]!(pos) / 2 : tween[27]!(pos - 1) / 2 + .5` — 引用 tween[26] 和 tween[27]
     - 自引用通过闭包实现, 运行时访问已初始化的 tween 数组 (初始化时箭头函数体未执行, 无 TDZ 问题)
     - 使用 `!` 非空断言 (eslint `no-non-null-assertion` 已关闭) 让 TS 接受 `tween[26]` 可能为 null 的类型
   - **`chartify(json: Chart): Chart`** (L364-L432) — 导出标准化 JSON
     - 强制 formatVersion = 3
     - 深拷贝 + 精度归一化: `Number(j.value.toFixed(6))` 保留 6 位小数
     - 过滤 `startTime == endTime` 的 speedEvents/judgeLineDisappearEvents/judgeLineMoveEvents/judgeLineRotateEvents (zero-length 事件)
     - Notes 不过滤 (保留 startTime == endTime 也不会影响, 因为 Note 没有 endTime 字段)
     - 保留原版动态属性赋值风格: `("speedEvents,notesAbove,...").split(",").map(i => newLine[i] = [])`

### 验证结果

#### TypeScript 类型检查
- `bunx tsc --noEmit src/lib/phigros/chart-parser.ts` ✅ 通过, 0 errors
- 修复的 3 个初始类型错误:
  - `parseInt(j.start / 1e3)` → `parseInt(String(j.start / 1e3))` (parseInt 签名要求 string)
  - `pushCommand(p)` (p 为 `string | number`) → `pushCommand(p as string)` (运行时必为 string, 因 raw[p] 已 truthy)

#### bun 运行时测试 (3 个谱面 + tween + chartify)
- **JSON 谱面** (SpasmodicSP.json, formatVersion 3): formatVersion=3, numOfNotes=2500, judgeLineList=24 ✅
- **PEC 谱面** (Tempestissimo.pec): formatVersion=3, offset=-0.255, numOfNotes=1540, judgeLineList=30 ✅
- **PEC 谱面** (ouroVoros.pec): formatVersion=3, numOfNotes=1269, judgeLineList=30 ✅
- **tween 数组**: length=30, 索引 0/1 为 null, 索引 2-29 为函数, 自引用 (27→26, 28→26+27) 工作正常, 端点值 (0→0, 1→1) 正确 ✅
- **chartify JSON/PEC**: 标准化输出, 过滤零长度事件, toFixed(6) 精度归一化 ✅

#### 1:1 等价性验证 (字节级)
通过 indirect eval 提取原版 emulator L1783-L2275 的 chart123/chartp23/tween/chartify, 在 bun 中 stub `globalThis.message = { sendWarning: ... }` 后运行, 对比 TS port 输出:

| 输出 | 原版 JS | TS port | 结果 |
|------|---------|---------|------|
| `JSON.parse(JSON.stringify(chart123(jsonChart)))` | 1,542,494 bytes | 1,542,494 bytes | ✅ IDENTICAL |
| `JSON.parse(JSON.stringify(chartp23(Tempestissimo.pec, ...)))` | 1,497,160 bytes | 1,497,160 bytes | ✅ IDENTICAL |
| `JSON.parse(JSON.stringify(chartp23(ouroVoros.pec, ...)))` | 1,385,997 bytes | 1,385,997 bytes | ✅ IDENTICAL |
| `JSON.parse(JSON.stringify(chartify(p1)))` | 1,398,341 bytes | 1,398,341 bytes | ✅ IDENTICAL |
| `JSON.parse(JSON.stringify(chartify(p2)))` | 2,869,889 bytes | 2,869,889 bytes | ✅ IDENTICAL |
| tween 28 个函数在 t=0/0.5/1 的返回值 | 84 个数值 | 84 个数值 | ✅ IDENTICAL |

所有 6 项输出 (3 个解析结果 + 2 个 chartify 结果 + tween 函数值) 与原版 JS **字节级完全一致**, 证明 1:1 移植无任何行为偏差。

### 关键移植决策

1. **`message.sendWarning` → `console.warn`**: 保留原版 msg 文案 (含中文 + filename 上下文), 仅删除 `message` 包装层。原版 `sendWarning` 内部就是 `console.warn('Phigros Emulator: ' + msg)` 立即 return, 故行为完全等价。

2. **内部 class 字段类型**: 原版用 `class JudgeLine { numOfNotes = 0; ... }` 类字段语法, 构造函数中动态 `("a,b,c").split(",").map(i => this[i] = [])` 初始化 9 个数组。TS 版显式声明 9 个数组字段类型 (`speedEvents: any[] = []` 等), 同时保留动态初始化逻辑 (1:1 移植, 略冗余但行为一致)。

3. **`rawarr: any[]` / `raw: any`**: PEC 词法分析的中间数据结构, 元素可能是 number/string/number[] (n 指令含 fuckarr 展开), 用 `any` 类型避免过度复杂的联合类型。原版 JS 也是隐式 any。

4. **`pushCommand` / `calcTime` 闭包函数**: 保留原版 function 声明 (非箭头函数), 利用 hoisting 在定义前使用 (与原版一致)。

5. **`tween` 自引用**: 索引 27/28 引用 tween[26]/tween[27], 通过箭头函数闭包 + 运行时访问实现。无需先定义数组再赋值, 因为初始化时箭头函数体未执行, 不触发 TDZ。用 `!` 非空断言让 TS 接受 `tween[26]` 类型为 `((pos: number) => number) | null`。

6. **`parseInt(String(j.start / 1e3))`**: 原版 `parseInt(number)` 在 JS 中自动转 string 再解析, TS 版显式 `String(...)` 保持完全等价 (而非改用 `Math.floor` — 对负数行为不同)。

7. **switch fallthrough**: chart123 的 `case 1: { ... }` 落到 `case 3: { }` 落到 `case 3473: break`, 保留原版语义。ESLint `no-fallthrough` 已在 eslint.config.mjs 中关闭。

### 文件路径列表

新建:
- `/home/z/my-project/src/lib/phigros/chart-parser.ts`

### 后续使用

- **songSelect 预览校验**: 在选歌时调用 `chart123(json)` 或 `chartp23(pec, filename)` 验证谱面可解析, 提前发现损坏的谱面文件。
- **核心模拟器**: whilePlaying 客户端组件加载谱面时调用本模块, 替代原版 emulator 中的同名函数。
- **chartify 标准化导出**: 可用于"另存为"功能, 将 PEC 谱面转换为 JSON 格式, 或对编辑器输出做精度归一化。
- 后续如需支持新的谱面格式 (如 phiScript), 可在本模块新增 `chartXYZ(...)` 函数, 输出统一的 `Chart` 接口。

---

## 任务 A-4（成绩编解码模块 + 5 个 React hooks）

**执行 Agent**: general-purpose
**目标**: 创建 Phi.ts 项目的成绩编解码模块和 5 个 React hooks，属于 M1（基础设施）的一部分

### 已创建文件

1. **`/home/z/my-project/src/lib/phigros/score-codec.ts`** — 成绩字符串编解码模块
2. **`/home/z/my-project/src/hooks/use-phigros-settings.ts`** — Zustand 设置 store（13 项 + persist）
3. **`/home/z/my-project/src/hooks/use-phigros-score.ts`** — 成绩读写 hook
4. **`/home/z/my-project/src/hooks/use-auto-scale.ts`** — 通用缩放 hook
5. **`/home/z/my-project/src/hooks/use-audio-context.ts`** — AudioContext 单例 + resume hook
6. **`/home/z/my-project/src/hooks/use-pwa-install.ts`** — A2HS 安装提示 hook

### 关键实现细节

#### 1. score-codec.ts
- **编码格式**: 40 字符/段 = 32 字符 md5 id + 3 字符 base22 acc + 4 字符 base32 score + 1 字符 base36 level
- **encodeScore**: `Math.round(acc*1e4+566).toString(22).slice(-3)` + `Math.round(score+40672).toString(32).slice(-4)` + `level.toString(36).slice(-1)`
- **decodeScore**: 与 encodeScore 互为反函数，带 NaN 防护
- **loadAllScores**: 按 40 字符步长切分 localStorage.phi，解码为 `Record<id, ScoreData>`
- **saveScore**: 1:1 对齐原版 `stat.getData(isAuto)` 逻辑：
  - 零值初始化（对应原版 reset 中 `data[id] = localData`）
  - 字符串比较取较大值（base22/base32 同长度字典序 = 数值序）
  - isAuto 时不写入，返回 `[false, scoreBest, "", true]`
  - 非 isAuto 返回 `[s2 < l2, scoreBest, delta, false]`，delta 为 "+ N" 或 "- N"
  - 写入时 `arr.sort(() => Math.random() - 0.5)` 乱序（与原版混淆一致）
- **getBestScore**: 从 localStorage 读取并解码为 7 位补零字符串
- 内部 `loadRawScores` / `saveRawScores` 保留原始 8 字符后缀形式供字符串比较

#### 2. use-phigros-settings.ts
- Zustand v5 + persist 中间件 + 自定义 `codenameStorage`
- **字段名映射**: state 用简短名（`inputOffset`），localStorage 用 codename（`input-offset`），向后兼容原版
- **自定义 storage**: `getItem` 遍历 13 个 codename key 组装 state JSON；`setItem` 解析后写入各 codename key
- **类型分离**: `BOOLEAN_FIELDS` 集合标记 9 个布尔字段（存储为 `"true"`/`"false"`），其余 4 个为数字字段
- **首次启动**: persist 自动检测 localStorage 无数据时使用 `SETTING_DEFAULTS` 默认值
- **partialize**: 排除 `setSetting` / `loadFromStorage` 方法不被持久化
- 导出 `SettingsField` 类型供类型安全使用

#### 3. use-phigros-score.ts
- 薄封装 hook，`useCallback` 缓存 `{ getBest, save, loadAll }` 三个方法
- 直接委托给 score-codec 模块函数

#### 4. use-auto-scale.ts
- 替代原版 `assets/autoScale.js`（原版用 `window.outerHeight`，本 hook 改用 `window.innerHeight` 更可靠）
- 监听 resize，设置 `target.style.transform = scale(innerHeight / baseHeight)`
- 默认 `baseHeight = 480`（与原版一致）
- 不强制设置 transform-origin（留给 CSS 控制）

#### 5. use-audio-context.ts
- 模块级单例 `audioContextInstance`（懒初始化）
- 兼容 `window.AudioContext` 和 `window.webkitAudioContext`（旧 Safari）
- `resume()`: 用户手势后调用，suspended 时恢复；多次调用安全（已 running 为 no-op）
- 注释说明 oggmented 由模拟器内部处理，本 hook 只返回标准 AudioContext

#### 6. use-pwa-install.ts
- 监听 `beforeinstallprompt` 事件，`e.preventDefault()` + 缓存事件
- 监听 `appinstalled` 事件自动清除缓存
- `canInstall`: boolean（是否有缓存的 prompt 事件）
- `promptInstall()`: 调用 `deferredPrompt.prompt()` + 等待 `userChoice` + 清除缓存
- 定义 `BeforeInstallPromptEvent` 接口（W3C 未标准化）

### 验证结果
- `npx tsc --noEmit` — src/ 目录下 0 错误（仅 examples/ 和 skills/ 有预存无关错误）
- score-codec 逻辑通过 Node.js 脚本验证：roundtrip、字符串比较单调性、saveScore 完整流程、isAuto 分支均正确

### 依赖关系
- 依赖 `@/lib/phigros/constants`（STORAGE_KEYS, SETTING_DEFAULTS）
- 依赖 `zustand` v5（已安装）
- 所有 hooks 标注 `'use client'`（使用 localStorage / window / AudioContext）

### 后续使用
- **whilePlaying 模拟器**: 游戏结束时调用 `usePhigrosScore().save(id, acc, score, level, isAuto)` 写入成绩
- **settings 页面**: 使用 `usePhigrosSettings` store 绑定表单控件，`setSetting` 实时持久化
- **LevelOver 结算页**: 调用 `getBestScore(id)` 显示历史最高分，`save()` 返回的 delta 用于显示差值
- **全屏游戏页面**: `useAutoScale(ref, 480)` 实现自适应缩放
- **音频播放**: `useAudioContext().resume()` 在首次用户交互时调用，解锁 AudioContext
- **首页/PWA 引导**: `usePwaInstall()` 控制"添加到主屏幕"按钮显示与触发

---
Task ID: M1-完成
Agent: 主代理 (Z.ai Code)
Task: M1 基础设施就绪 — 资源迁移、全局样式、PWA/SW、hooks/lib、谱面解析

Work Log:
- A-1 资源迁移: 147 个文件复制到 public/phigros/，排除 desktop.ini 和 terrasphere
- A-4前置: 创建 constants.ts (游戏常量/设置项/难度色/评级阈值) + asset-paths.ts (全资源路径常量)
- A-5 谱面解析: 子代理创建 chart-parser.ts (583行)，含 chart123/chartp23/chartify/tween + 完整TS类型。3个谱面字节级验证通过 (JSON 2500 notes, PEC 1540/1269 notes)
- A-4 成绩编解码+hooks: 子代理创建 score-codec.ts (1:1对齐stat.getData) + 5个hooks (settings/score/auto-scale/audio-context/pwa-install)。运行时测试: encode/decode roundtrip、saveScore持久化、isAuto分支全部通过
- A-2 全局样式: 子代理创建 phigros.css (字体注册+8个动画关键帧+skew工具类+全局黑底) + 改造layout.tsx (Phi.ts标题/manifest/图标/viewport)
- A-3 PWA/SW: 子代理创建 sw.js (30个预缓存+activate事件清理) + PhigrosProvider.tsx (全局SW注册，修复原版bug) + 更新manifest.webmanifest
- 额外修复: eslint.config.mjs 添加原版JS文件忽略

Stage Summary:
- Lint: 0 errors ✅
- Dev server: 运行正常，所有端点返回200 ✅
- Agent Browser: 页面标题"Phi.ts"，无console错误 ✅
- 谱面解析: JSON(v3,2500notes) + PEC(v3,1540/1269notes) 全部通过，与原版字节级一致 ✅
- 成绩编解码: encode/decode/saveScore/getBest/loadAll 全部通过，phi编码格式与原版兼容 ✅
- 资源: 147个文件 (排除desktop.ini和terrasphere) ✅
- SW: 全局注册 (修复原版仅index.html注册的bug) ✅
- 产出文件:
  - src/lib/phigros/: constants.ts, asset-paths.ts, chart-parser.ts, score-codec.ts (4个)
  - src/hooks/: use-phigros-settings.ts, use-phigros-score.ts, use-auto-scale.ts, use-audio-context.ts, use-pwa-install.ts (5个新增)
  - src/styles/: phigros.css
  - src/components/phigros/: PhigrosProvider.tsx
  - public/: sw.js, phigros/ (147个资源文件)
  - src/app/layout.tsx (改造)
  - public/phigros/manifest.webmanifest (更新)
  - eslint.config.mjs (更新)

---

## Task ID: B-8（LoadingChartOverlay 组件）

**执行 Agent**: 主代理 (Z.ai Code)
**任务**: 创建 Phi.ts 项目的 LoadingChartOverlay 组件（谱面加载遮罩），替代原版 whilePlaying 中用 iframe 嵌入 loadingChartScreen 的设计。M2 外围页面迁移的一部分。

### 产出文件
- `/home/z/my-project/src/components/phigros/LoadingChartOverlay.tsx`（新建，约 145 行）
- `/home/z/my-project/src/styles/phigros.css`（追加 loadingChartScreen 专属样式块，约 230 行，位于 `darkOverlay.fadeIn` 后、tapToStart 前后）
- `/home/z/my-project/agent-ctx/B-8-loading-chart-overlay.md`（详细工作记录）

### 实现要点
- **Props**: `{ chart: string, level: string, visible: boolean }` — visible 为 false 时 return null 且不发起 fetch
- **数据加载**: `useEffect` 依赖 `[chart, visible]`，visible 为 true 时并发 fetch `CHART_META(chart)` + `TIPS_JSON`
- **状态管理**: `useState<SongMeta | null>` 存谱面元数据，`useState<string>` 存随机 tip；用 `cancelled` 标志处理 race condition
- **难度数字**: `Math.floor(meta[`${level}Ranking`])`，通过 `rankingMap` 查表保持类型安全
- **难度标识**: `phi-lcs-level-${levelLower}` class 控制 ::after 内容（EZ/HD/IN/AT）
- **背景**: 根 div inline style 设置曲绘背景（meta 加载前用 `INITIAL_BACKGROUND` 占位），不污染 `document.body`
- **类名前缀**: 所有类名加 `phi-lcs-` 前缀避免与 songSelect/LevelOver 等页面的同名通用类（`songName`/`level`/`tip`/`loadingBar` 等）冲突

### 1:1 对齐原版
- `div.mainContent`（height:70%, padding:0 10%, flex row）
- `div.textInfo`（skew(-15deg)）+ 子元素 skew(15deg) 还原
- `div.songInfoFrame`（75px×350px, rgba(0,0,0,.8), padding:10px 10px 10px 20px, margin:25px）
- `div.level`（90px 宽白底, height:calc(100%+35px)）+ `::before` 显示 data-level + `::after` 显示 EZ/HD/IN/AT
- `div.chartDesigner`/`div.illustrator`（margin:10px 0 10px 80px, font-size:18px, ::before "Chart"/"Illustration"）
- `div.songImage`（skew(-15deg)）+ `img.illustration`（width:150%, margin-right:-50px, skew(15deg)）
- `div.tip`（fixed, left:2%, bottom:5%, ::before "Tip: "）
- `div.loadingBar`（fixed, right:2%, bottom:5%）+ TxT 闪烁 + BG 白块平移
- backdrop-filter:blur(100px) + background-size:cover !important

### 关键帧决策
- `loadingBarBGAnim` / `loadingBarTXTAnim` 复用 phigros.css 顶部已有的同名关键帧（功能等价）
- `slideAndFadeIn` 不复用顶部版本（顶部是 margin-top:150px→80px，原版是 margin:10px 0 10px 150px→80px），新增 `phi-lcs-slideAndFadeIn` 严格 1:1 复刻原版（含 70% 中间关键帧）

### 原版 bug 修复
- `Math.random()*(tipsArray.length+1)` 越界取到 `undefined` → 改为 `Math.floor(Math.random() * tips.length)`
- 同步 XHR `xhr.open(..., false)` 阻塞主线程 → 改为 `fetch + .then` 异步

### 验收结果
- `bun run lint`: 0 errors ✅
- `npx tsc --noEmit`: 0 errors（对 LoadingChartOverlay.tsx） ✅
- Dev server: 运行正常，无编译错误 ✅

### 后续使用
whilePlaying 模拟器组件中，在游戏资源未就绪时渲染此遮罩：
```tsx
<LoadingChartOverlay chart={chartCodename} level={difficulty} visible={!resourcesReady} />
```
资源就绪后将 `visible` 切换为 false 即可移除遮罩。

---

## 任务 B-2（tapToStart 页面迁移）

**执行 Agent**: Fullstack
**目标**: 1:1 迁移 `phigros-html5/tapToStart/`（index.html 24 行 + style.css 93 行 + index.js 43 行）到 Next.js App Router 客户端组件
**路由**: `/tap-to-start`

### 产出文件
- `/home/z/my-project/src/app/tap-to-start/page.tsx`（'use client'，187 行）
- `/home/z/my-project/src/styles/phigros.css`（末尾追加 tapToStart 专属样式，~118 行）

### 原版功能 1:1 对齐
| # | 原版行为 | 实现方式 |
|---|---|---|
| 1 | Phigros logo（`/phigros/assets/images/Phigros.png`，height:20%, max-width:80%, object-fit:scale-down） | `<img>` + `.tts-phigrosLogo`，src 用 `PHIGROS_LOGO` 常量 |
| 2 | "点 击 屏 幕 开 始"（margin:30px, color:#fff） | `<div className="tts-tapToStart">` |
| 3 | 背景音乐 autoplay loop（TouchToStart0.mp3） | `<audio ref={audioRef} autoPlay loop src={TOUCH_TO_START_AUDIO}>` + useEffect 中 `audio.play()` |
| 4 | 背景 InitialBackground.png center center no-repeat fixed, cover | CSS `.tts-bg-1` / `.tts-bg-2` background |
| 5 | 三层 backdrop-filter:blur（html 15px + html::before 10px + body 10px） | 两层 fixed div（`.tts-bg-1` 无模糊作底 + `.tts-bg-2` filter:blur(10px)）+ `.tts-container` backdrop-filter:blur(10px) |
| 6 | body flex 居中列布局 | `.tts-container` flex column center |
| 7 | 每 2s 生成气泡 div（15×15, 50% 圆, box-shadow, 85% 白） | `setInterval(2000)` 创建 `.tts-bubble` 附加到 body，11950ms 后 remove |
| 8 | float 关键帧 0/20/50/75/95/100% opacity 脉冲 + bottom:100% | 新增 `@keyframes ttsFloat`（与 phigros.css 顶部已有的 `float` 不同：原版用 bottom:100%，仓库版用 translateY；为避免冲突用独立名） |
| 9 | 点击任意处 → 插入 fadeIn 遮罩 + setInterval(10ms) 音量渐弱 + 510ms 后跳转 | `document.body.addEventListener('click', handleClick)`，`audio.volume = Math.max(0, audio.volume - 0.1)`，510ms 后 `router.push` |
| 10 | fadeIn 关键帧 0%{opacity:0}（100% 默认 1） | 复用 phigros.css 顶部已有的 `@keyframes fadeIn` |
| 11 | DOMContentLoaded 后 audio.play() | `useEffect` 内 `audio.play().catch(()=>{})` 处理自动播放限制 |

### React 适配决策
- **三层模糊映射**：原版用 `html` / `html::before` / `body` 选择器，在 Next.js 中 html/body 由根 layout 控制，改为两层 fixed div + 内容容器 backdrop-filter 实现等价视觉效果
- **跳转目标**：`/settings`（首次）/ `/chapter-select`（非首次），由 `window.localStorage.length === 0` 判断
- **多点击防护**：用 `clickedRef` 保证只生效一次（原版未防护；React Strict Mode 下 useEffect 重跑会重复注册监听，已通过 cleanup 正确处理）
- **音量边界**：原版 `audio.volume -= 0.1` 在 volume 为 0 后仍持续设置负值，现代浏览器会抛 IndexSizeError，加 `Math.max(0, ...)` 防护并在 volume=0 时停止 fade timer
- **清理**：useEffect cleanup 清除所有定时器、移除监听、移除残留 `.tts-bubble` / `.tts-fadeIn` DOM
- **audio.play() 异步**：捕获 Promise rejection（浏览器自动播放策略可能阻止），与原版"仅尝试一次"行为一致

### 关键帧决策
- **不复用 phigros.css 顶部 `@keyframes float`**：顶部版本用 `transform:translateY(-100vh)` + 0/10/90/100% 关键帧；原版 tapToStart 用 `bottom:100%` + 0/20/50/75/95/100% 关键帧。两者数值和动画属性均不同。新增 `@keyframes ttsFloat` 严格 1:1 复刻原版，避免影响其他可能引用 `float` 的页面
- **复用 `@keyframes fadeIn`**：顶部版本 `0%{opacity:0} 100%{opacity:1}` 与原版 `0%{opacity:0}`（100% 默认 1）等价

### 验收结果
- `bun run lint`: 0 errors, 0 warnings ✅
- `bunx tsc --noEmit`: 0 errors（对 page.tsx 与 phigros.css）✅
- Dev server 自动管理（按规范未手动启动）

### 后续依赖
- 跳转目标 `/settings` 与 `/chapter-select` 路由待 M2 后续任务实现

---

## 任务 B-5（settings 页面 + SettingSlider/SettingToggle 组件）

**执行 Agent**: general-purpose (Z.ai Code)
**任务 ID**: B-5
**目标**: M2 外围页面迁移 — 创建 Phi.ts 项目的 settings（设置）页面，1:1 对齐原版 phigros-html5/settings 视觉与交互，并修复 3 个原版 bug

### 已创建文件

1. **`/home/z/my-project/src/components/phigros/SettingSlider.tsx`** — 滑块组件
2. **`/home/z/my-project/src/components/phigros/SettingToggle.tsx`** — 开关组件
3. **`/home/z/my-project/src/app/settings/page.tsx`** — 设置页面（'use client'，路由 `/settings`）
4. **`/home/z/my-project/src/styles/phigros.css`** — 末尾追加 settings 专属样式（"/* settings */" 注释分隔）

### 原版对照（1:1 对齐点）

| 原版元素 | 实现位置 | 备注 |
|---------|---------|------|
| body 背景 InitialBackground.png + backdrop-filter:blur(100px) | `.settings-root` 包裹层 | Next.js 共享 body，故改为页面级 div |
| `div.leftArea`（左倾斜面板） | `.settings-root .leftArea` | skew(-15deg), rgba(0,0,0,0.103), min-width:500px |
| `div.backBtn`（左上角返回按钮） | `.settings-root .backBtn` + onClick handleBack | ::before 黑底 + drop-shadow(#fff 5px 0)，::after back.png + skew(15deg) scale(.5) |
| `div.item`（设置项容器） | `.settings-root .item` | 75px 高，flex column，50px 上下 margin |
| `div.title`（设置项标题） | `.settings-root .title` + data-name/data-value 属性 | ::before 显示 data-name，::after 显示 data-value，transform:skew(15deg) |
| `div.slider`（滑块容器） | `.settings-root .slider` | 95% 宽 30px 高，黑底 #00000056，::before "-" + ::after "+" 35px 白块 skew(15deg) |
| `div.slideBlock`（滑块） | `.settings-root .slideBlock` | position:relative, 35px 宽 120% 高，pointer-events:none，由 marginLeft 控制位置 |
| `div.toggle`（开关） | `.settings-root .toggle` | 65×25px 黑底，::before 30px 白块；.checked 时 justify-content:end + ::after "√" |
| `button.button`（关于我们/清除数据按钮） | `.settings-root .button` | 200px 宽，2px #FFF 边框，skew(15deg)，transparent 背景 |
| wheel/touch 滚动（修改 #settingItems margin-top） | useEffect + window 事件 | 原版 e.wheelDeltaY/8 → 现代 e.deltaY 符号取反；touchmove 补充 prevTouch 更新（原版漏掉） |
| slider 点击逻辑（offsetX > width-35 → +1；offsetX < 35 → -1） | SettingSlider.handleClick | 用 e.currentTarget + getBoundingClientRect 计算 offsetX（比原版 e.target 更可靠） |
| slider 边界检测（prevValue>=80&&offset==1 / prevValue<=-80&&offset==-1 阻止） | currentIndex 钳制 [0, options.length-1] | 由 currentIndex 自然边界替代原版硬编码 ±80% |
| toggle 点击逻辑（切换 checked 类 + 写 localStorage） | SettingToggle onClick | 受控于 currentValue，onChange 委托给 setSetting |
| loadSettings() / saveSettings() | usePhigrosSettings store + persist 中间件 | store 自动从 localStorage 同步水合，setSetting 即时写回 |

### 13 个设置项（按原版顺序 + bug 修复新增 2 项）

| # | 名称 | codename | 类型 | 数据源 |
|---|------|----------|------|--------|
| 1 | 谱面延时(MS) | input-offset | slider 201 档 | INPUT_OFFSET_OPTIONS（-500~500 步进 5）|
| 2 | 按键缩放 | select-scale-ratio | slider 5 档 | SCALE_RATIO_OPTIONS（真实值 6000~10000）|
| 3 | 背景亮度 | select-global-alpha | slider 5 档 | GLOBAL_ALPHA_OPTIONS（真实值 0.2~1）|
| 4 | 开启打击音效 | hitSong | toggle 默认开 | SETTING_DEFAULTS |
| 5 | 开启多押辅助 | highLight | toggle 默认开 | SETTING_DEFAULTS |
| 6 | 游玩时自动全屏 | autoFullscreen | toggle 默认开 | SETTING_DEFAULTS |
| 7 | 开启FC/AP指示器 | lineColor | toggle 默认关 | SETTING_DEFAULTS |
| 8 | 开启HyperMode | hyperMode | toggle 默认关 | SETTING_DEFAULTS |
| 9 | 背景模糊显示 | imageBlur | toggle 默认开 | SETTING_DEFAULTS |
| 10 | 开启触摸反馈 | feedback | toggle 默认关 | SETTING_DEFAULTS |
| 11 | 显示定位点 | showPoint | toggle 默认关 | SETTING_DEFAULTS |
| 12 | **【新增】显示过渡动画** | showTransition | toggle 默认开 | SETTING_DEFAULTS（原版被注释）|
| 13 | **【新增】画面宽高比** | select-aspect-ratio | slider 8 档 | ASPECT_RATIO_OPTIONS（1.25~1.777778）|

额外按钮：
- "关于我们" → `router.push('/about-us')`
- "清除全部数据" → `localStorage.clear()` → `router.push('/')`

### Bug 修复点

1. **select-scale-ratio / select-global-alpha 存真实值**：原版 settings 存档位索引（"3"），模拟器读取真实值（8000/0.6）；迁移后统一存真实值。SettingSlider 内部通过 `options.findIndex(o => o.value === currentValue)` 映射档位 ↔ 真实值。
2. **showTransition 启用**：原版 settings HTML 注释掉了此项，但模拟器在使用。本页面将其启用为 toggle，默认开。
3. **select-aspect-ratio 暴露**：原版隐藏 select 有此项但 resizeCanvas 不读取。本页面在 settings 暴露（模拟器读取由 M3 处理）。
4. **slider 位置由 currentIndex 直接计算**：原版按累计 marginLeft 增量更新，易漂移；本组件由 `((currentIndex - midIndex) / total) * 200` 直接计算，保证与 store 状态严格一致。
5. **touchmove 补充 prevTouch 更新**：原版只在 touchstart 设置 prevTouch，导致 touchmove 中位移累积。本实现每次 touchmove 后更新 prevTouch。
6. **wheelDeltaY → deltaY**：原版用已废弃的 `e.wheelDeltaY`，本实现用现代 `e.deltaY` 并取反符号保持方向一致。

### 关键实现细节

#### SettingSlider.tsx
- props: `{ codename, label, options: {label,value}[], currentValue, onChange }`
- 由 `options.findIndex(o => o.value === currentValue)` 计算当前档位
- marginLeft = `((currentIndex - (options.length - 1) / 2) / options.length) * 200` %
  - 与原版累计公式等价（5 档时端点 ±80%，201 档时端点 ±99.5%）
- handleClick 用 `e.currentTarget.getBoundingClientRect()` 计算 offsetX，避免原版 e.target 的歧义（点击 slideBlock 时 e.target 是 slideBlock）
- slideBlock 加 `pointer-events: none` 确保 e.target 始终是 slider
- 加 `transition: margin-left 0.12s ease` 让滑块移动更平滑
- aria-* 属性支持无障碍

#### SettingToggle.tsx
- props: `{ codename, label, currentValue, onChange }`
- 受控组件：`className={toggle${currentValue ? ' checked' : ''}}`
- onClick → onChange(!currentValue)
- 键盘支持：Enter/Space 触发切换

#### page.tsx
- 用 `useSyncExternalStore(subscribeNoop, () => true, () => false)` 检测客户端渲染
  - 避免 SSR/CSR hydration mismatch（zustand persist 在客户端同步从 localStorage 水合，首帧值与 SSR 默认值不同）
  - 比传统的 `useEffect + setMounted(true)` 模式更优，不触发 `react-hooks/set-state-in-effect` 告警
- 未挂载时渲染空 `<div className="settings-root" aria-busy="true" />`
- 挂载后调用 `usePhigrosSettings.getState().loadFromStorage()` 确保与 persist 水合结果一致
- wheel/touch 事件挂在 window 上，passive: true
- 用 `useRef` 持久化 yCoord 和 prevTouchY，避免闭包陈旧值
- 用 `useState` 持有 marginTop 触发重渲染

### 验证结果

#### bun run lint
- ✅ 0 errors, 0 warnings（src/ 目录全部通过）

#### TypeScript 类型检查
- ✅ Settings 相关文件 0 错误（`bunx tsc --noEmit` 仅报 examples/ 和 src/app/level-over/page.tsx 的无关错误）

#### Dev server
- ✅ `GET /settings` 返回 HTTP 200
- ✅ SSR 返回 `<div class="settings-root" aria-busy="true"></div>` 占位（避免 hydration mismatch）
- ✅ 客户端 JS chunk（`/_next/static/chunks/_7a37a6f6._.js`, 83910 bytes）包含全部 13 个设置项标签、13 个 codename、InitialBackground.png 引用
- ✅ phigros.css 包含 settings 专属样式（.settings-root, .leftArea, .backBtn, .item, .title, .slider, .slideBlock, .toggle, .button）

#### 路由跳转
- 返回按钮 → `/chapter-select`（当前 404，待 M2 其他 agent 创建）
- 关于我们 → `/about-us`（当前 404，待 M2 其他 agent 创建）
- 清除全部数据 → `localStorage.clear()` → `/`

### 持久化验证（设计层面）
- SettingSlider onChange → settings.setSetting('inputOffset', v) → zustand set → persist codenameStorage.setItem → localStorage.setItem('input-offset', String(v))
- SettingToggle onChange → settings.setSetting('hitSong', v) → 同上 → localStorage.setItem('hitSong', 'true'/'false')
- 刷新页面 → persist 中间件自动水合 → usePhigrosSettings.getState() 读取 localStorage → 13 项值保持

### 依赖关系
- 依赖 `@/hooks/use-phigros-settings`（A-4 已创建）
- 依赖 `@/lib/phigros/constants`（SCALE_RATIO_OPTIONS, GLOBAL_ALPHA_OPTIONS, ASPECT_RATIO_OPTIONS, INPUT_OFFSET_RANGE）
- 依赖 `@/lib/phigros/asset-paths`（未直接使用，因 CSS 直接引用 /phigros/assets/images/InitialBackground.png 和 back.png）
- 依赖 `@/styles/phigros.css`（layout.tsx 中已导入）
- 被依赖：将来 `/chapter-select` 页面会链接到 `/settings`；`/about-us` 页面会被本页"关于我们"按钮链接

### 后续使用
- **chapter-select 页面（M2）**：可在标题栏添加齿轮图标按钮，点击跳转 `/settings`
- **whilePlaying 模拟器（M3）**：读取 usePhigrosSettings 中的 13 项值应用到游戏逻辑（select-aspect-ratio 影响 resizeCanvas，showTransition 影响过场动画）
- **about-us 页面（M2）**：被本页"关于我们"按钮链接

---

## 任务 B-6（LevelOver 结算页面）

**执行 Agent**: general-purpose
**目标**: 创建 Phi.ts 项目的 LevelOver（结算）页面，属于 M2 外围页面迁移的一部分

### 已创建/修改文件

1. **`/home/z/my-project/src/app/level-over/page.tsx`**（新建，283 行）— 结算页客户端组件
2. **`/home/z/my-project/src/styles/phigros.css`**（修改，追加 400 行）— LevelOver 专属样式

### 实现要点

#### 1. URL 参数解析（10 个参数）
- `useSearchParams()` 读取 `play`/`l`/`score`/`mc`/`p`/`g`/`b`/`m`/`e`/`c`
- 由于 Next.js 16 要求 `useSearchParams` 必须包裹在 `<Suspense>` 边界中，拆分为 `LevelOverPage`（默认导出 + Suspense）+ `LevelOverContent`（实际内容）
- 所有数值参数用 `parseInt(..., 10) || 0` 防止 NaN

#### 2. 核心计算（1:1 对齐原版 index.js）
- **accuracy** = `Math.round((perfect + good*0.65) / (perfect+good+bad+miss+0) * 10000) / 100`
  - 保留原版的 `+0` 防除零（实际不会触发，因为至少有 perfect）
- **late** = `good - early`
- **grade** 评级判定（萌娘百科规则）：
  - `score==0` → 无评级（不渲染 `<img>`）
  - `<700000` → F（F15F.png）
  - `700000-819999` → C（C15C.png）
  - `820000-879999` → B（B15B.png）
  - `880000-919999` → A（A15A.png）
  - `920000-959999` → S（S15S.png）
  - `960000-999999` → V（V15V.png）；若 `good==0 && bad==0 && miss==0` → V_FC（V15FC.png）
  - `>=1000000` → Phi（phi15phi.png）
  - **注**: 原版 `<699999` 是 typo（699999 分无评级），本实现按萌娘百科规则修正为 `<700000`
- **ΔRKS** = `accuracy>=70 ? Math.pow((accuracy-55)/45, 2) * levelRanking : 0`，`toFixed(2)` 显示
  - `levelRanking` 从 meta.json 的 `${level}Ranking` 字段读取（如 `inRanking`），`Math.floor` 取整

#### 3. 资源加载
- **meta.json**: `useEffect` + `fetch(CHART_META(play))` 异步加载（原版用同步 XHR，已弃用）
- **背景音乐**: `<audio ref={audioRef} loop />`，`useEffect` 中设置 `audio.src = LEVEL_OVER_WAV(playLevel)` 并 `audio.play()`
  - `playLevel` = `gameLevels[levelStr]`（0/1/2/3 对应 ez/hd/in/at）
  - `play().catch(...)` 捕获自动播放策略拒绝（避免未处理 Promise 拒绝）
- **背景图**: meta 加载前用 `INITIAL_BACKGROUND`，加载后用 `CHART_ILLUSTRATION(play, meta.illustration)`
- **曲绘 img**: 同上，`#` 替换为 `%23`（URL 编码，原版 `replaceAll('#', "%23")`）
- **评级图**: `RANK_IMAGE(RANK_IMAGES[grade])`（如 `RANK_IMAGES['a']` = `'A15A.png'` → `/phigros/assets/images/A15A.png`）

#### 4. 缩放（1:1 对齐原版 onresize 版本）
- `useEffect` 中 `rootRef.current.style.transform = scale(${window.outerHeight/480})`
- 监听 `resize` 事件重算
- **注**: 原版 index.js 第5行（初始）用 `innerHeight/devicePixelRatio`，第128行（onresize）用 `outerHeight/480`，按任务要求"以 onresize 为准"，统一用 `outerHeight/480`
- **注**: 原版 `body.children[0]` 是 retryBtn（首子元素），存在 bug 只缩放重试按钮；本实现改为缩放 `lo-main-content` 整体（视觉正确，符合原意）
- 未使用现成的 `useAutoScale` hook（该 hook 用 `innerHeight`，与原版 onresize 的 `outerHeight` 不一致）

#### 5. 跳转
- `useRouter().push()` 替代原版 `location.href = ...`（避免 `react-hooks/immutability` lint 错误）
- **retryBtn** → `/while-playing?play=...&l=...&c=...`
- **backBtn** → `/song-select?c=...`
- 用 `useCallback` 缓存 handler，依赖项明确

#### 6. DOM 结构（1:1 对齐原版 index.html）
```
<div.lo-bg>                      ← 替代原版 body 背景
<div.lo-retry-btn>               ← 左上角，::before 黑底 skew + ::after Retry.png
<div.lo-flex-container>          ← 替代原版 body flex 居中
  <div.lo-main-content ref>      ← 800x300，scale 缩放
    <div.lo-left-part>           ← 60% 宽，skew(-15deg)
      <img.lo-song-img>          ← 200% 宽 + skew(15deg) 反倾斜
      <div.lo-song-name>         ← absolute bottom-left
      <div.lo-level-string>      ← absolute bottom-right，"IN Lv.21"
    <div.lo-score-outer-container> ← skew(-15deg)
      <div.lo-score-frame>       ← 50% 高，padding 5% 20% 5% 10%
        <div.lo-score>           ← 7 位补零分数
        <img.lo-grade>           ← 评级图
      <div.lo-at-a-glance>       ← 15% 高，maxCombo + accuracy
      <div.lo-detail-frame>      ← 15% 高，perfect/good/bad/miss + early/late
<div.lo-extra-info>              ← 底部中央，"本曲最终RKS:XX.XX"
<div.lo-back-btn>                ← 右下角，::before 黑底 skew + ::after backInResault.png
<audio ref loop>                 ← 背景音乐
```

#### 7. CSS 实现（追加到 phigros.css 末尾，`/* LevelOver */` 注释分隔）
- **动画命名冲突处理**: 全局 `slideIn`/`scaleDown`/`extract` 在 M1 时已定义但关键帧与原版 LevelOver 不同（M1 简化版）。本任务用 `lo-` 前缀避免覆盖：
  - `lo-slideIn`: opacity 0→1（原版 LevelOver 同名）
  - `lo-slide`: margin-left 200%→0（原版 LevelOver 独有）
  - `lo-scaleDown`: 0% opacity:0 scale(1.5) skew(15deg) → 75% opacity:1 scale(1.5) skew(15deg) → 100% scale(1) skew(15deg)
  - `lo-extract`: 5 个关键帧（0%/50%/69%/70%/100%），width 0→200px + padding 过渡 + opacity 延迟出现
- **分阶段动画延迟**:
  - mainContent: `lo-slideIn .5s + lo-slide .5s`
  - scoreFrame: `lo-slideIn .8s + lo-slide .7s`
  - atAGlance: `lo-slideIn 1s + lo-slide .8s`
  - detailFrame: `lo-slideIn 1.4s + lo-slide .9s`
  - gradeImage: `lo-scaleDown .8s cubic-bezier(0,0,1,0.25)`
  - extraInfo: `lo-extract 2s ease-out`
- **背景层 `.lo-bg`**: `position: fixed; inset: 0; background-size: cover; backdrop-filter: blur(100px)`，替代原版 body 背景
- **flex 容器 `.lo-flex-container`**: `position: fixed; inset: 0; display: flex; justify-content: center; align-items: center; pointer-events: none`，mainContent 内部 `pointer-events: auto`
- **extraInfo 水平居中**: 显式 `left: calc(50% - 100px)`（原版依赖 body flex 静态位置计算，浏览器实现可能不一致，本实现显式居中保证稳定性）
- **lo-grade 默认 transform**: `skew(15deg)`，避免 `lo-scaleDown` 动画结束后 transform 丢失反倾斜
- **按钮 ::after 背景图**: 直接用字面量 URL `/phigros/assets/images/Retry.png` 和 `/phigros/assets/images/backInResault.png`（CSS 伪元素无法用 JS 常量）

### Lint 修复过程

1. **`react-hooks/immutability`**: `window.location.href = ...` 触发"修改组件外变量"错误 → 改用 `useRouter().push()`
2. **`react-hooks/set-state-in-effect`**: `useEffect` 中 `setBgUrl(...)` 触发"级联渲染"错误 → 改为派生值（render 期间计算 `bgUrl`，不存 state）
3. **import 错误**: `RANK_IMAGES` 误从 `asset-paths.ts` 导入（实际在 `constants.ts`）→ 修正为从 `constants.ts` 导入

### 验证结果

#### Lint
- `bun run lint` ✅ 0 errors, 0 warnings

#### Dev server
- `GET /level-over?play=sample&l=in&score=883736&mc=238&p=528&g=67&b=8&m=8&e=17&c=single` → **200** ✅
- 所有 4 个难度（ez/hd/in/at）均返回 200 ✅

#### 评级逻辑验证
| score | good/bad/miss | 期望评级 | 实际评级图 | 结果 |
|-------|---------------|----------|------------|------|
| 883736 | 67/8/8 | A | A15A.png | ✅ |
| 1000000 | 0/0/0 | Phi | phi15phi.png | ✅ |
| 970000 | 0/0/0 | V_FC | V15FC.png | ✅ |
| 970000 | 100/0/0 | V | V15V.png | ✅ |
| 0 | 0/0/0 | 无评级 | (无 img) | ✅ |

#### 数值验证（test URL: score=883736, p=528, g=67, b=8, m=8, e=17, l=in）
- **score**: `883736` → 7 位补零 `0883736` ✅
- **accuracy**: `(528 + 67*0.65) / (528+67+8+8) * 100 = 571.55/611 * 100 = 93.54%` ✅
- **late**: `good - early = 67 - 17 = 50` ✅
- **maxCombo**: `238` ✅
- **perfect/good/bad/miss**: `528/67/8/8` ✅
- **early/late**: `17/50` ✅
- **levelString**: `IN Lv.21`（meta.inRanking=21，Math.floor=21）✅
- **ΔRKS**: `((93.54-55)/45)^2 * 21 = (0.8564...)^2 * 21 = 0.7335 * 21 = 15.40` ✅（SSR 阶段 meta 未加载显示 `0.00`，客户端 fetch 完成后更新为 `15.40`，发生在 extract 动画的 opacity:0 阶段，用户不可见）

#### 资源可达性
- `meta.json`、`LevelOver2.wav`、`A15A.png`、`Retry.png`、`backInResault.png`、`SpasmodicSP.png`、`InitialBackground.png` 全部 HTTP 200 ✅

### 与原版的偏差说明

1. **同步 XHR → 异步 fetch**: 原版用 `XMLHttpRequest.open(..., false)` 同步加载 meta.json（已弃用），本实现用 `fetch + useState` 异步加载。副作用：SSR 阶段 meta 为 null，RKS 显示 `0.00`，曲名为空，难度字符串为空；客户端 fetch 完成后（~100ms）更新为正确值。由于 extract 动画在 0-1.38s 期间 opacity:0，用户不会看到闪烁。
2. **`location.href` → `useRouter().push`**: 原版用 `location.href = ...` 全页面刷新，本实现用 Next.js 客户端路由（更流畅，但目标页面 while-playing/song-select 尚未实现，跳转后会 404，待后续任务实现）。
3. **缩放目标**: 原版 `body.children[0]` 是 retryBtn（首子元素），存在 bug 只缩放重试按钮。本实现改为缩放 `lo-main-content`（视觉正确，符合原意）。
4. **extraInfo 水平定位**: 原版依赖 body flex 静态位置计算（浏览器实现可能不一致），本实现显式 `left: calc(50% - 100px)` 保证稳定居中。
5. **评级 `<700000` 边界**: 原版 `<699999` 是 typo（699999 分无评级），本实现按萌娘百科规则修正为 `<700000`。
6. **背景层分离**: 原版 body 同时承担背景图 + flex 居中，本实现拆分为 `.lo-bg`（背景层）+ `.lo-flex-container`（flex 居中层），避免缩放 transform 影响背景。

### 文件路径列表

新建:
- `/home/z/my-project/src/app/level-over/page.tsx`（283 行）

修改:
- `/home/z/my-project/src/styles/phigros.css`（追加 400 行 LevelOver 专属样式，位于 `.darkOverlay.fadeIn` 之后、`/* settings */` 之前）

---

## 任务 B-3（chapterSelect 章节选择页面 + ChapterCard 组件）

**执行 Agent**: general-purpose
**目标**: 创建 Phi.ts 项目的 chapterSelect（章节选择）页面 + ChapterCard 组件，属于 M2 外围页面迁移

### 已创建/修改文件

1. **`/home/z/my-project/src/components/phigros/ChapterCard.tsx`**（新建，~72 行）— 章节卡片组件
2. **`/home/z/my-project/src/app/chapter-select/page.tsx`**（新建，~190 行）— 章节选择页面（'use client'）
3. **`/home/z/my-project/src/styles/phigros.css`**（修改，追加 ~215 行）— chapterSelect 专属样式

### 实现要点

#### 1. ChapterCard 组件（props: `{ name, codename, image, onClick }`）
- DOM 结构：`<div.cs-chapterContainer data-name data-codename onClick>` 包含 `<img.cs-chapterImage>`
- 点击行为 1:1 对齐原版 `chapterSelect/index.js`：
  - `if ((e.target as HTMLImageElement).src != null) return;` — 点击 img 不触发（img.src 是字符串 != null 为 true）
  - 点击 div（::before/::after 区域）→ `onClick(codename)`（div.src 是 undefined，!= null 为 false，因 `undefined == null`）
- `useCallback` 缓存 handler，依赖 `[codename, onClick]`

#### 2. chapter-select/page.tsx（'use client'）
- **章节数据**：硬编码 single（name="单曲 精选集", codename="single", image=`${CHAPTER_IMAGES}/Single.png`），1:1 对齐原版（其余 12 个章节在原版被注释）
- **背景音乐**：`<audio ref loop autoPlay src={CHAPTER_SELECT_AUDIO}>`，useEffect 中调用 `play()` 绕过自动播放限制
- **三层背景模糊**（原版 html + html::before + body backdrop-filter）：
  - `.cs-bg-1`（z-index:-3）黑底（等价原 html background:#000）
  - `.cs-bg-2`（z-index:-2）InitialBackground.png + `filter:blur(10px)` + `backdrop-filter:blur(15px)`（等价原 html::before 两条规则合并）
  - `.cs-body`（z-index:0）InitialBackground.png + `backdrop-filter:blur(15px)`（等价原 body）
- **wheel 水平滚动**（1:1 对齐原版语义，用 deltaY 替代已废弃的 wheelDeltaY）：
  - 用 `bodyRef` + `bodyLeftRef`（useRef 持有数值）直接操作 `body.style.left`，避免每帧 re-render
  - 公式：`newLeft = currentLeft - deltaY / 1.5`（取负因 deltaY 与 wheelDeltaY 符号相反，保持"向下滚→内容左移"语义）
  - 左边界：`currentLeft >= 0 && deltaY < 0` → 阻止（已到最左，向上滚）
  - 右边界：`maxScroll > 0 && currentLeft <= -maxScroll && deltaY > 0` → 阻止（已到最右，向下滚）
  - `maxScroll = body.offsetWidth - window.innerWidth`
  - 边界夹紧：`newLeft` 限制在 `[-maxScroll, 0]`（原版无此防护，属合理改进防 overshoot）
  - 监听挂在 `window` 上，`{ passive: true }`（不调用 preventDefault）
- **点击章节**（handleChapterClick）：
  1. `new Audio(TAP_AUDIO(1)).play()` — 播放 Tap1.wav（与原版 `document.createElement('audio')` 等价）
  2. `setFadeIn(true)` — darkOverlay 加 cs-fadeIn 类
  3. `setTimeout(() => router.push('/song-select?c=' + codename), 400)` — 400ms 后跳转
- **设置按钮**：`<button.cs-settingBtn onClick={handleSettingClick}>` → `router.push('/settings')`
- **darkOverlay**：`className={cs-darkOverlay${fadeIn ? ' cs-fadeIn' : ''}}`，state 控制 className
- **清理**：useEffect cleanup 移除 wheel 监听 + 清除 navigateTimer

#### 3. CSS（追加到 phigros.css 末尾，`/* chapterSelect */` 注释分隔）
- 所有类名加 `cs-` 前缀避免与全局 `.darkOverlay`（z-index:9999, transition）等冲突
- **.cs-chapterContainer**：`transform: skew(-15deg); max-height:450px; height:80%; width:85vh; margin-left:25px; flex-shrink:0; box-shadow:#000 0 0 10px 0; overflow:hidden`
- **.cs-chapterImage**：`height:100%; width:150%; object-fit:cover; transform: skew(15deg) translateX(-20%)`
- **.cs-chapterContainer::before**：`content: attr(data-name); position:absolute; right:0; top:0; margin:2.5% 5%; font-size:1.2em; transform:skew(15deg); text-shadow:0 0 5px #000; z-index:1`
- **.cs-chapterContainer::after**：`content: '▷  P L A Y'; linear-gradient(105deg, #00000000 15%, #fff 11%, #fff); right:0; bottom:0; margin:0 15px 0 0; font-size:1.3rem; font-weight:bold; transform: translateX(18%) skew(15deg); width:45%; height:15%; z-index:1; cursor:pointer`（保留原版重复 margin 声明的 quirk，后者覆盖前者）
- **.cs-settingBtn**：`position:fixed; left:calc(100% - 75px); bottom:15px; width:100px; height:50px; z-index:1`
  - `::before`：黑色斜切底 `background:#000; transform:skew(-15deg); filter:drop-shadow(#fff -5px 0); z-index:1`
  - `::after`：setting.png 图标 `background:url(setting.png); transform:scale(0.5); z-index:5`
- **.cs-darkOverlay**：`position:fixed; opacity:0; z-index:0; animation: cs-fadeOut 1s ease-out`
  - `.cs-fadeIn` 类：`animation: cs-fadeIn 0.5s ease-out !important`
- **@keyframes cs-fadeIn / cs-fadeOut**：含 `z-index:999` 切换（0% 和 100% 都设 z-index:999），与全局 fadeIn 关键帧（无 z-index 切换）不同，故加 cs- 前缀
- **.cs-body**：`position:fixed; top:-10px; left:0; height:100vh; width:max-content; min-width:100vw; display:flex; align-items:center; overflow-y:hidden; overflow-x:scroll; transition:0.1s all ease-in-out; backdrop-filter:blur(15px); padding-left:100px`

### 与原版的偏差说明

1. **position: absolute → fixed**：原版 body 是 `position:absolute`（相对 html），改为 `position:fixed`（相对 viewport），等价且避免依赖祖先定位上下文。
2. **width: max-content**：原版 body `min-width:100%` + `width:auto`（shrink-to-fit）在内容超出视口时会触发 body 内部滚动条。改为 `width:max-content; min-width:100vw` 使容器随内容增长，滚动完全由 JS `style.left` 控制。
3. **wheelDeltaY → deltaY**：原版用已废弃的 `e.wheelDeltaY`（正值=向上滚），现代浏览器用 `e.deltaY`（正值=向下滚，符号相反）。公式改为 `newLeft = currentLeft - deltaY/1.5` 保持"向下滚→内容左移"语义。
4. **边界夹紧**：原版无夹紧，trackpad 大 deltaY 可能 overshoot。增加 `newLeft` 限制在 `[-maxScroll, 0]`。
5. **类名前缀 cs-**：避免与全局 `.darkOverlay`（transition 而非 animation，z-index:9999 常驻）冲突。原版 `div.darkOverlay` 用 animation + z-index 切换，行为不同。
6. **`location.href` → `router.push`**：避免 `react-hooks/immutability` lint 错误，使用 Next.js 客户端路由。

### 验证结果

#### Lint
- `bunx eslint src/components/phigros/ChapterCard.tsx src/app/chapter-select/page.tsx` → **0 errors, 0 warnings** ✅
- `bun run lint`（全项目）：1 个 pre-existing error 在 `src/app/song-select/page.tsx:535`（`react-hooks/refs`，B-2 song-select 的代码，非本任务范围）

#### Dev server
- `GET /chapter-select` → **HTTP 200** ✅（首次编译 273ms，渲染 97ms）
- `GET /settings` → **HTTP 200** ✅（设置按钮跳转目标，B-5 已实现）
- `GET /song-select?c=single` → **HTTP 200** ✅（章节点击跳转目标，B-2 已实现）

#### SSR 内容验证
HTML 包含全部预期元素：
- `cs-chapterContainer` / `cs-chapterImage` / `cs-settingBtn` / `cs-darkOverlay` / `cs-body` 类名 ✅
- `单曲 精选集`（data-name 章节名）✅
- `Single.png`（章节封面图）✅
- `ChapterSelect0.mp3`（背景音乐）✅
- `setting.png`（CSS 中引用）✅

### 依赖关系
- 依赖 `@/lib/phigros/asset-paths`（CHAPTER_IMAGES, CHAPTER_SELECT_AUDIO, TAP_AUDIO）
- 依赖 `@/styles/phigros.css`（layout.tsx 中已导入）
- 被依赖：
  - `/tap-to-start`（B-8 已实现）点击后跳转 `/chapter-select`（localStorage 非空时）
  - `/settings`（B-5 已实现）返回按钮跳转回 `/chapter-select`
  - `/song-select?c=single`（B-2 已实现）章节点击跳转目标

### 文件路径列表

新建:
- `/home/z/my-project/src/components/phigros/ChapterCard.tsx`（~72 行）
- `/home/z/my-project/src/app/chapter-select/page.tsx`（~190 行）

修改:
- `/home/z/my-project/src/styles/phigros.css`（追加 ~215 行 chapterSelect 专属样式，位于 `.tts-fadeIn` 之后）

---

## 任务 B-4（songSelect 页面 + SongList/SongItem/LevelChooser/ScoreDisplay 组件）

**执行 Agent**: Z.ai Code (主代理)
**目标**: 创建 Phi.ts 项目的 songSelect（歌曲选择）页面，属于 M2 外围页面迁移的一部分。这是 M2 中最复杂的页面。

### 已创建/修改文件

1. **`/home/z/my-project/src/components/phigros/SongList.tsx`**（新建，114 行）— 歌单容器组件，含 SongMeta 类型导出
2. **`/home/z/my-project/src/components/phigros/SongItem.tsx`**（新建，91 行）— 单曲条目（songItemContainer + songItem + level）
3. **`/home/z/my-project/src/components/phigros/LevelChooser.tsx`**（新建，102 行）— 4 难度选择器（ez/hd/in/at + fadeOut/fadeIn 动画）
4. **`/home/z/my-project/src/components/phigros/ScoreDisplay.tsx`**（新建，49 行）— 分数显示占位（"0000000" + .unplayed NEW）
5. **`/home/z/my-project/src/app/song-select/page.tsx`**（新建，566 行）— 歌曲选择页面（'use client'）
6. **`/home/z/my-project/src/styles/phigros.css`**（追加 ~440 行）— songSelect 专属样式（`/* songSelect */` 注释分隔）
7. **`/home/z/my-project/public/phigros/assets/images/play.png`**（从原版 songSelect/play.png 复制）

### 1:1 对齐原版 phigros-html5/songSelect/

#### DOM 结构对齐

| 原版元素 | 实现位置 | 备注 |
|---------|---------|------|
| `audio#slicedAudioElement` | `<audio ref={audioRef} id="slicedAudioElement" />` | src 由 useEffect 命令式设置 |
| `div.darkOverlay` | `<div className="darkOverlay" />` | ss-fadeIn 0.5s linear (opacity 1→0) |
| `div.backBtn` | `.song-select-root .backBtn` | ::before 黑底 + drop-shadow，::after back.png + skew(15deg) scale(.5) |
| `div.readyToLoadOverlay` | `className={`readyToLoadOverlay${go ? ' go' : ''}`}` | .go 类触发 ss-slideIn 2s cubic-bezier(0.52,0.28,0.04,0.98) |
| `div.leftArea` | `.song-select-root .leftArea` | skew(-15deg), margin-left:100px, width:350px, bg #00000050 |
| `div.topLeftBar` | 同 | sortMode "默认" + settingBtn "设置" |
| `div.songList#songList` | `<SongList />` 组件 | position:absolute, top:100+topOffset |
| `div.rightArea#rightArea` | `<div ref={rightAreaRef} style={{transform,right}}>` | skew(-15deg) scale 缩放 |
| `div.illustrationContainer > img.illustration` | 同 | 150% width, 245px height, skew(15deg) |
| `div.detailBar` | 同 | levelChooser + score |
| `div.levelChooser` | `<LevelChooser />` 组件 | 4 个 levelItem，选中 height:120% + 难度色 |
| `div.score` | `<ScoreDisplay />` 组件 | "0000000" + .unplayed NEW（占位） |
| `div.playBtn` | `<div className="playBtn" onClick={handlePlay} />` | play.png 背景 |

#### 数据流对齐（原版 index.js）

| 步骤 | 实现 |
|------|------|
| URL 参数 `c` | `useSearchParams().get('c') ?? 'single'` |
| fetch `/phigros/charts/{c}.json` | `fetch(CHAPTER_LIST(chapter))` |
| fetch 每首歌 meta.json | `Promise.all(codenames.map(c => fetch(CHART_META(c))))` |
| 创建歌单 | `<SongList items={songMetaList} />` |
| 默认 levelSelected="ez" | `useState<Difficulty>('ez')` |
| switchSong(0) | `setSelectedSongIndex(0)` 在 metas 加载后 |

#### SongList.switchSong 副作用

| 步骤 | 实现 |
|------|------|
| 播放 Tap5.wav | `playOneShot(TAP_AUDIO(5))` |
| fetch illustration → blob → URL.createObjectURL | `fetch(...).then(r => r.blob()).then(blob => URL.createObjectURL(blob))` |
| 设背景 + img.illustration.src | `setIllustrationUrl(newUrl)` → 驱动 bgStyle + img src |
| 设 audio.src = musicFile | `audio.src = CHART_MUSIC(codename, musicFile)` |
| currentTime = sliceAudioStart | `audio.currentTime = Number(meta.sliceAudioStart) \|\| 0` |
| play + setInterval(15s) 循环 | `audio.play()` + `setInterval(() => {audio.currentTime = sliceStart; audio.play()}, 15000)` |
| 更新 levelItem data-level | LevelChooser 自动派生自 songMeta prop |

#### LevelChooser changeLevel 动画

- `displayLevel`：立即更新（驱动 SongList 中所有 SongItem）
- `chooserLevel`：延迟 300ms 更新（驱动 .selected 类）
- `pendingLevel`：300ms 动画期间（驱动 .fadeIn 类）
- setTimeout 300ms 后：`setChooserLevel(new); setPendingLevel(null)`

#### rightArea 缩放（原版 index.js 49-58 行）

```ts
scale = innerHeight / 400 / Math.round(devicePixelRatio / 2)
right = 0.2 * clientHeight  // 原版 0.2 * (clientHeight/clientWidth) * clientWidth 简化
```

#### wheel/touch 滚动

- `e.wheelDeltaY / 8` → `e.deltaY / 8`（符号取反）
- `if (newYCoord <= 0 \|\| e.wheelDeltaY < 0)` → `if (newY <= 0 \|\| e.deltaY > 0)`
- 修改 songList inline style top: `${100 + topOffset}px`
- touchmove 补充 prevTouchY 更新（原版漏掉导致位移累积）

#### readyToLoadTrigger

- 加 .go 类触发 slideIn
- 播放 Tap7.wav
- 2s 后 `router.push('/while-playing?play=...&l=...&c=...')`

### Bug 修复点（相对原版）

1. **wheelDeltaY → deltaY**：原版用已废弃 API
2. **同步 XHR → 异步 fetch**：原版 `xhr.open(..., false)` 阻塞主线程
3. **touchmove prevTouch 漏更新**：原版导致位移累积
4. **songList position 跳变**：原版首次滚动从 relative 跳到 absolute，本实现始终 absolute
5. **blob URL 内存泄漏**：原版切换歌曲时未 revokeObjectURL
6. **sliceInterval 卸载清理**：原版未在卸载时清理

### 关键技术决策

1. **SSR/CSR hydration**：`useSyncExternalStore` 检测客户端，SSR 渲染空 `.song-select-bg` 占位
2. **useSearchParams Suspense**：拆分 `SongSelectPage`（Suspense）+ `SongSelectContent`
3. **三层状态分离**（LevelChooser 切换动画）：displayLevel / chooserLevel / pendingLevel
4. **CSS 关键帧前缀**：`ss-fadeIn` / `ss-slideIn` / `ss-fade` 避免与全局同名关键帧冲突
5. **CSS 选择器作用域**：`.song-select-root .class` 避免与全局 `.darkOverlay`、`.settings-root .backBtn` 冲突
6. **react-hooks/refs lint 规避**：`handlePlay` 内部访问 ref，单独定义 `handlePlayKey` 不通过 `handleKey` 间接调用
7. **背景层分离**：`.song-select-bg`（背景层）+ `.song-select-root`（内容层，backdrop-filter 模糊背景层）

### 验收结果

#### bun run lint
- ✅ 0 errors, 0 warnings

#### TypeScript 检查
- ✅ song-select 相关文件 0 错误

#### Dev server
- ✅ `GET /song-select?c=single` 返回 HTTP 200（22KB HTML）
- ✅ `GET /song-select`（无 c 参数）返回 200
- ✅ SSR 返回 `<div class="song-select-bg" aria-busy="true"></div>` 占位
- ✅ 客户端 JS chunk（73161 bytes）包含所有关键 class 名
- ✅ CSS chunk 包含 16 个 `.song-select-root .xxx` 选择器

#### 资源可达性
- ✅ play.png / single.json / sample meta / illustration / music / Tap5.wav / Tap7.wav 全部 200

#### 跳转
- 返回按钮 → `/chapter-select`（已存在）
- 设置按钮 → `/settings`（已存在）
- 播放按钮 → `/while-playing?play=...&l=...&c=...`（M3 待实现）

### 3 首歌数据验证（chapter=single）

| codename | name | 难度 (ez/hd/in/at) | sliceAudioStart |
|----------|------|-------------------|-----------------|
| sample | Spasmodic(Haocore Mix) | 1/11/21/31 | 63.6 |
| samplePec | Tempestissimo | 16/16/16/16 | 76 |
| ouroVoros | ouroVoros | 15/15/15/15 | 79 |

### 文件路径列表

新建:
- `/home/z/my-project/src/components/phigros/SongList.tsx`（114 行）
- `/home/z/my-project/src/components/phigros/SongItem.tsx`（91 行）
- `/home/z/my-project/src/components/phigros/LevelChooser.tsx`（102 行）
- `/home/z/my-project/src/components/phigros/ScoreDisplay.tsx`（49 行）
- `/home/z/my-project/src/app/song-select/page.tsx`（566 行）
- `/home/z/my-project/agent-ctx/B-4-song-select-page.md`（详细工作记录）

修改:
- `/home/z/my-project/src/styles/phigros.css`（追加 ~440 行 songSelect 专属样式，位于 aboutUs 之后）

资源:
- `/home/z/my-project/public/phigros/assets/images/play.png`（从原版 songSelect/play.png 复制）

---

## 任务 B-7（aboutUs 关于我们页面）

**执行 Agent**: Fullstack
**目标**: 创建 `/about-us` 路由，1:1 迁移 phigros-html5/aboutUs/ 双阶段 SPA（1061 行静态 HTML credits）

### 已读文件
- `phigros-html5/aboutUs/index.html`（1061 行）— 双阶段 SPA 入口，含完整 credits 静态内容
- `phigros-html5/aboutUs/main.js`（57 行）— autoScroll + clickToExit 跳过逻辑
- `phigros-html5/aboutUs/index.css`（58 行）— intro 阶段样式（Phigros logo + touch to start）
- `phigros-html5/aboutUs/main.css`（81 行）— credits 阶段样式（滚动 + 双列 musicCredits + 黑屏过渡）
- `phigros-html5/aboutUs/main.html`（1025 行）— credits 预览版（不建路由，仅参考）
- `src/lib/phigros/asset-paths.ts` — 确认 ABOUT_US 常量（audio0/audio1/snrLogo）已存在
- `src/styles/phigros.css` — 确认未占用 `au-` 前缀
- `src/app/tap-to-start/page.tsx` — 参考客户端组件结构（useRef + useEffect + body click 监听）

### 实现概要

#### 1. credits 内容提取（避免手抄 1061 行错误）

用 Python 脚本 `/tmp/extract_credits_v2.py` 从原版 index.html 逐字抽取 6 个 pre 标签的 textContent（含首尾空白、Tab 缩进、错别字、全角/半角混排），生成 `src/lib/phigros/about-us-credits.ts`。

关键点：
- 用深度计数法处理 musicCredits pre 内嵌套的 leftSide/rightSide pre（首个 `</pre>` 是 leftSide 的闭合，不是 musicCredits 的）
- 保留原版首字符 `\n`（HTML5 规范自动剥离，与浏览器渲染等价）
- 保留原版尾部 `\n\t` / `\n\t\t\t`（pre 标签会原样渲染）
- 用 `replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')` 转义 TS 模板字符串特殊字符

**1:1 验证**：Python 脚本逐字符比对，6 个 section 全部 exact match：
| Section | chars | lines |
|---------|-------|-------|
| FROM_GAME_DIRECTOR_1（HanHan233 写在前面） | 350 | 12 |
| FROM_GAME_DIRECTOR_2（Soullies 原作感言） | 842 | 22 |
| CREDITS（Pigeon Games 12 组名单） | 2800 | 246 |
| MUSIC_CREDITS_HEADER（Sound/Music 标题） | 57 | 6 |
| MUSIC_CREDITS_LEFT（左列 363 行） | 7714 | 363 |
| MUSIC_CREDITS_RIGHT（右列 360 行） | 7799 | 360 |
| **合计** | **19562** | **1009** |

加上 page.tsx 中硬编码的 thanksAllHelpers + thankYou（~3 行），总 credits 内容 ~1012 行，与原版 index.html 1061 行（含 HTML 包装）匹配。

#### 2. CSS 追加（phigros.css 末尾，"/* aboutUs */" 注释分隔）

新增 ~180 行 aboutUs 专属样式，使用 `au-` 前缀避免与全局 `.darkOverlay` / `.hide` / `.fadeIn` 等冲突：

**intro 阶段**（源自 index.css）：
- `.au-intro-root` — fixed 全屏黑底 + blur(15px) + flex column center
- `.au-phigrosLogo` — height:20% / max-width:80% / object-fit:scale-down
- `.au-tapToStart` — margin:30px / color:#fff / letter-spacing:1.1em + 6s 脉动动画
- `@keyframes au-letterSpacingStretch` — 1.1em → 1.2em → 1.1em

**credits 阶段**（源自 main.css）：
- `.au-credits-root` — height:100% / flex column center / scrollbar-width:none + ::-webkit-scrollbar display:none
- `.au-pre` — text-align:center / line-height:1.5em / white-space:pre
- `.au-pre-fromGameDirector` — line-height:2.2em
- `.au-pre-musicCredits` + `.au-mainContent` — flex column / row 居中
- `.au-pre-leftSide`（text-align:right）+ `.au-pre-rightSide`（margin-top:60px, text-align:left）
- `.au-clickToExitTag` — fixed top-left / opacity:0 / transition:0.3s / z-index:10
- `.au-blackOverlay` — fixed 全屏 / opacity:0 / transition:0.3s / z-index:20
- `.au-thanksAllHelpers` + `.au-thankYou` — margin-top/bottom:25%

#### 3. 页面实现（src/app/about-us/page.tsx，'use client'）

**双阶段 SPA**：
- `useState<'intro' | 'credits'>` 管理阶段
- intro 阶段：Phigros logo + "touch to start"，onClick → setStage('credits')
- credits 阶段：完整 credits 内容 + audio + autoScroll + 跳过提示

**Refs（1:1 对应原版 main.js 全局变量）**：
- `audioRef` — audioElem
- `autoScrollIntervalRef` — window.autoScrollInterval
- `clickToExitCounterRef`（初始 6） — clickToExitCounter
- `currentAudioRef`（'audio0'|'audio1'） — 替代 audioElem.getAttribute('src') 比较
- `blackOverlayRef` / `clickToExitTagRef` — DOM 引用
- `navigatedRef` — 防止重复导航
- `isMountedRef` — 防止卸载后调用 router.push
- `endFadeTimerRef` / `navTimerRef` / `clickToExitResetTimerRef` — 定时器引用

**autoScroll 逻辑**（1:1 还原原版 main.js autoScroll 函数）：
1. `audio.src = ABOUT_US.audio0` + `play()`（捕获 autoplay 拒绝）
2. `audio.addEventListener('ended', ...)` — 切换 AboutUs0 ↔ AboutUs1 循环
3. `document.body.scrollTo(0,0)` + `document.body.style.marginTop = '0px'`
4. `setInterval(12ms)`：
   - 读取 `document.body.style.marginTop`（parseFloat）
   - 终止条件：`document.body.offsetHeight + currentMarginTop < window.screenX / 4`（1:1 还原原版 screenX 阈值，多数桌面浏览器 screenX=0 时条件等价于 marginTop < -offsetHeight，credits 内容会被完整滚过）
   - 终止后：3s 等 → blackOverlay.opacity=1 → 1s 等 → router.push('/chapter-select')
   - 每帧 `document.body.style.marginTop = topSize + 'px'`，topSize -= 0.5

**跳过逻辑**（1:1 还原原版 main.js body click 监听）：
- 每次 click：`clickToExitCounterRef.current -= 1`
- 更新 clickToExitTag 文字 `'再点击${counter}次以跳过'` + opacity `'0.${10-counter}'`
- counter === 0：stopAutoScroll + blackOverlay.opacity=1 + 1s 后 navigate
- 5s 后重置 counter 为 6 + 300ms 后更新 tag 文字 + tag.opacity=0（清除之前的 timer，避免原版多 timer 叠加副作用）

**清理**：
- useEffect cleanup 清除 interval / timers / audio 'ended' 监听 / audio.pause()
- 重置 `document.body.style.marginTop = ''` 避免污染其他页面
- 移除 body click 监听

#### 4. JSX 结构（1:1 还原原版 #main 内容）

```jsx
<>
  <div className="au-blackOverlay" ref={blackOverlayRef} />
  <div className="au-clickToExitTag" ref={clickToExitTagRef} />
  <div className="au-credits-root">
    <audio ref={audioRef} />
    <pre className="au-pre au-pre-fromGameDirector">{FROM_GAME_DIRECTOR_1}</pre>
    <pre className="au-pre au-pre-fromGameDirector">{FROM_GAME_DIRECTOR_2}</pre>
    <pre className="au-pre au-pre-credits">{CREDITS}</pre>
    <img src={ABOUT_US.snrLogo} className="au-snrLogo" />
    <pre className="au-pre au-pre-musicCredits">
      {MUSIC_CREDITS_HEADER}
      <div className="au-mainContent">
        <pre className="au-pre au-pre-leftSide">{MUSIC_CREDITS_LEFT}</pre>
        <pre className="au-pre au-pre-rightSide">{MUSIC_CREDITS_RIGHT}</pre>
      </div>
    </pre>
    <div className="au-thanksAllHelpers">感谢所有为Phigros提供帮助的个人或团体</div>
    <div className="au-thankYou">And <br />You. <br /></div>
  </div>
</>
```

注：musicCredits pre 内嵌套 pre + div 是原版的非标准但合法的 HTML 结构，React 直接渲染无问题。

### 关键技术决策

1. **credits 内容独立文件**：1061 行静态文本放 `about-us-credits.ts` 而非 page.tsx，避免组件文件臃肿、便于 lint 与维护
2. **Python 脚本提取**：避免手抄 1009 行文本出错，逐字符验证 1:1 匹配
3. **保留首尾空白**：首字符 `\n` 由 HTML5 规范自动剥离（与原版浏览器渲染等价），尾部 `\n\t` 保留渲染
4. **document.body.style.marginTop**：1:1 还原原版滚动机制（修改 body 而非 wrapper），全屏 overflow:hidden 下 body 偏移产生滚动效果
5. **window.screenX/4 阈值**：保留原版"bug"（screenX 多数情况为 0，条件等价于 offsetHeight + marginTop < 0，即完整滚过）
6. **currentAudioRef 替代 getAttribute('src')**：避免浏览器对 src 属性的 URL 规范化差异，更可靠
7. **navigatedRef + isMountedRef 双重防护**：防止 React Strict Mode 双调用与卸载后导航
8. **clearTimeout(clickToExitResetTimerRef)**：原版每次 click 都新增 setTimeout 导致多 timer 叠加（虽然最终都重置为 6 无害），React 实现清除前一个再设新的，行为等价且无 timer 泄漏
9. **au- 前缀**：避免与全局 .darkOverlay / .hide / .fadeIn 等同名类冲突
10. **body 共享**：Next.js layout.tsx 的 body 全局应用 phigros.css 的 overflow:hidden，无需在 useEffect 中改 body overflow

### Bug 修复点（相对原版）

1. **多 timer 叠加**：原版每次 click 都新增 5s reset timer，本实现清除前一个再设新的
2. **audio.volume 边界**：原版未涉及（本页无音量渐弱），无需修复
3. **isMounted 防护**：原版用 location.href 整页跳转，无卸载问题；React router.push 不重载页面，需防止卸载后导航
4. **body.marginTop 清理**：原版整页跳转自动清理；React 需在 useEffect cleanup 中显式重置

### 验收结果

#### bun run lint
- ✅ 0 errors, 0 warnings

#### Dev server
- ✅ `GET /about-us` 返回 HTTP 200（首次编译 335ms，后续 ~40ms）
- ✅ SSR 返回 intro 阶段 HTML：`<div class="au-intro-root" role="button" tabindex="0" aria-label="touch to start"><img src="/phigros/assets/images/Phigros.png" alt="Phigros" class="au-phigrosLogo" draggable="false"/><div class="au-tapToStart">touch to start</div></div>`
- ✅ 客户端 JS chunk（src_app_about-us_page_tsx_6bf46230._.js）正常加载
- ✅ 无运行时错误，无 hydration warning

#### 1:1 内容验证
- ✅ 6 个 section 全部 char-for-char exact match（含 Tab 缩进、错别字如 `Ilustration` / `Barbarinerman ` / `Music/音乐组，` / `Plots Design /剧情组`、全角逗号、curly quotes `""`）
- ✅ 总 credits 内容 1009 行 + thanksAllHelpers/thankYou 3 行 = 1012 行（原版 1061 行含 HTML 包装）

#### 资源可达性
- ✅ `/phigros/assets/images/Phigros.png` — 200
- ✅ `/phigros/aboutUs/snr.png` — 200
- ✅ `/phigros/aboutUs/AboutUs0.mp3` — 200
- ✅ `/phigros/aboutUs/AboutUs1.mp3` — 200

#### 跳转
- 滚到底 → 3s 黑屏 + 1s 后 → `/chapter-select`（已存在，返回 200）
- 5s 内连点 6 次 → 1s 黑屏后 → `/chapter-select`

### 文件路径列表

新建:
- `/home/z/my-project/src/app/about-us/page.tsx`（315 行，'use client' 双阶段 SPA）
- `/home/z/my-project/src/lib/phigros/about-us-credits.ts`（1021 行，6 个 credits 文本常量）
- `/home/z/my-project/agent-ctx/B-7-about-us-page.md`（详细工作记录）

修改:
- `/home/z/my-project/src/styles/phigros.css`（追加 ~180 行 aboutUs 专属样式，位于 chapterSelect 之后，"/* aboutUs */" 注释分隔）

### 后续依赖
- `/chapter-select` 路由已存在（M2 其他 agent 已实现），跳转目标可达
- `/settings` 路由已存在，settings 页面的"关于我们"按钮已链接到 `/about-us`（B-5 agent 已实现）


---
Task ID: M2-完成
Agent: 主代理 + 5个full-stack-developer子代理
Task: M2 外围页面迁移 — 8个页面 + 9个组件全部用Next.js+React+shadcn/ui重写

Work Log:
- B-1 index 介绍页: 主代理创建 src/app/page.tsx，含 MPL-2 警告 + tapToStart 链接 + 测试音频 + A2HS 按钮(usePwaInstall) + 手动缓存按钮(31个资源进度条) + 更新日志
- B-2 tapToStart: 子代理创建 src/app/tap-to-start/page.tsx + phigros.css 追加样式。Phigros logo + "点 击 屏 幕 开 始" + 背景音乐 + 每2s气泡(float 12s动画) + 点击fadeIn+音量渐弱+510ms跳转
- B-3 chapterSelect: 子代理创建 ChapterCard.tsx + chapter-select/page.tsx。倾斜章节卡片(skew-15deg) + ::before data-name + ::after "▷ P L A Y" + 设置按钮 + wheel水平滚动(边界检测) + 点击Tap1+darkOverlay+400ms跳转
- B-4 songSelect: 子代理创建 SongList/SongItem/LevelChooser/ScoreDisplay + song-select/page.tsx。3首歌歌单 + 切歌(Tap5+illustration blob+切片音频15s循环) + 4难度选择器(色+定数) + wheel滚动 + readyToLoadTrigger(slideIn+Tap7+2s跳转)
- B-5 settings: 子代理创建 SettingSlider/SettingToggle + settings/page.tsx。13个设置项(含bug修复新增 showTransition + select-aspect-ratio) + 2按钮(关于我们/清除数据) + wheel滚动 + Zustand持久化
- B-6 LevelOver: 子代理创建 level-over/page.tsx。评级逻辑(F/C/B/A/S/V/V15FC/Phi) + RKS计算 + 分阶段动画(mainContent .5s→scoreFrame .8s→atAGlance 1s→detailFrame 1.4s→gradeImage scaleDown→extraInfo extract 2s) + 背景音乐 + retry/back
- B-7 aboutUs: 子代理创建 about-us/page.tsx + about-us-credits.ts(1033行)。双阶段SPA(intro→credits) + 1012行credits内容(2感言+Pigeon Games 12组名单+SNR logo+曲目credits双列) + autoScroll(12ms/-0.5px) + 双音乐循环 + 跳过手势(5s连点6次)
- B-8 LoadingChartOverlay: 子代理创建 LoadingChartOverlay.tsx。替代原版iframe，skew风格 + 曲名/曲师/谱师/曲绘 + 随机tip + loadingBar动画 + slideAndFadeIn

Stage Summary:
- Lint: 0 errors ✅
- 全部7个路由返回200: / /tap-to-start /chapter-select /song-select?c=single /settings /level-over?... /about-us ✅
- Agent Browser 全页验证:
  - / : MPL警告+tapToStart链接+测试音频+A2HS按钮+缓存按钮+更新日志 ✅
  - /tap-to-start : Phigros logo+"点 击 屏 幕 开 始"+气泡动画 ✅
  - /chapter-select : 倾斜章节卡片+"单曲 精选集"+"▷ P L A Y"+设置按钮 ✅
  - /song-select?c=single : 3首歌(SpasmodicSP/Tempestissimo/ouroVoros)+难度选择器(EZ1/HD11/IN21/AT31)+曲绘+播放按钮 ✅
  - /settings : 13设置项(3slider+9toggle+1宽高比slider)+2按钮 ✅
  - /level-over : 曲名+IN Lv.21+分数0883736+MaxCombo238+Acc93.54%+P528/G67/B8/M8+Early17/Late50 ✅
  - /about-us : 阶段一"touch to start"→点击→阶段二完整credits(1000+行曲目信息) ✅
- 产出:
  - 7个路由页 (src/app/*/page.tsx)
  - 9个组件 (src/components/phigros/*.tsx)
  - 1个credits数据 (src/lib/phigros/about-us-credits.ts, 1033行)
  - phigros.css 增至 2080 行
  - 1个play.png资源
- Bug修复验证:
  - showTransition 设置项已启用 ✅
  - select-aspect-ratio 设置项已暴露 ✅
  - select-scale-ratio/global-alpha 存真实值 ✅
  - 同步XHR全部改fetch ✅
  - wheelDeltaY(废弃)改deltaY ✅
- 无运行时错误(dev.log干净) ✅

---
Task ID: M3-完成
Agent: 主代理
Task: M3 核心模拟器封装 — 2366+302 行原版 JS 封装为 Next.js client 组件

Work Log:
- C-1 模拟器源码移植: 复制原版 script.phigros.emulator.js (2366行) 为 .ts，做最小改造：
  - 包进 createEmulator(deps) 工厂函数，返回 init/destroy/replay/pauseToggle/btnPlayClick/tapToStart
  - chart123/chartp23/chartify/tween 从 chart-parser.ts import
  - DOM 引用从 deps.elements 传入（getElementById → deps.elements.xxx）
  - 资源路径改为绝对路径 /phigros/whilePlaying/assets/
  - 谱面路径改为 /phigros/charts/
  - 删除 zip.js 死依赖 + loadFile 函数
  - 修复 LevelOver 音频路径（Bug 1）
  - 修复 selectaspectratio 未生效（Bug 2，采用注释版 resizeCanvas）
  - 修复 pauseOverlay 倒计时 innerHTML 重写（Bug 4，改为 onPause/onCountdown/onResume 回调）
  - qwqdraw2 跳转改为 deps.onFinish 回调
  - window.onload → initResources async 函数
  - 原版 index.js 逻辑整合（loadChartResources + btnPlayClickHandler + replay + applySettings）
  - 闭包局部变量（Renderer/chartString/bgs/chartLineData/chartLineTextureDecoded 等）
- C-2 PhigrosEmulator 组件: client 组件，useRef 持有 canvas + 20个隐藏配置面板元素
  - useEffect 动态加载 oggmented + stackblur → createEmulator → init
  - pauseOverlay 用 React 状态机（hidden/paused/countdown-3/2/1）
  - LoadingChartOverlay + tapToStart 提示
  - settings 同步到隐藏配置面板
- C-3 while-playing 页面: Client Component 薄壳，useSearchParams 读参数
- 样式: whilePlaying/style.css 追加到 phigros.css

Stage Summary:
- Lint: 0 errors, 5 warnings（原版代码风格的空语句，不影响运行）✅
- /while-playing?play=sample&l=in&c=single 返回 200 ✅
- 资源加载: 内置资源(25个) + 谱面(meta/chart/illustration/lineTexture/music) 全部加载成功 ✅
- Renderer 12 字段填充完成，ResourcesLoad=200 ✅
- tapToStart 提示显示，点击后游戏启动 ✅
- canvas 渲染（854x480），判定线可见 ✅
- 3 个谱面路径测试: sample(JSON) 已验证，samplePec(PEC)/ouroVoros(PEC) 路径相同
- Bug 修复验证:
  - Bug 1 LevelOver 音频路径: 已修正为 /phigros/whilePlaying/assets/LevelOver*.ogg ✅
  - Bug 2 selectaspectratio: 已启用注释版 resizeCanvas + 恢复 change 监听 ✅
  - Bug 4 pauseOverlay: 已改为 React 状态机 + 回调 ✅
  - Bug 7 zip.js: 已删除加载和 loadFile 死代码 ✅
- 产出:
  - src/components/phigros/emulator/script.phigros.emulator.ts (2583行)
  - src/components/phigros/PhigrosEmulator.tsx (276行)
  - src/app/while-playing/page.tsx (18行)
  - src/styles/phigros.css 追加 whilePlaying 样式

---
Task ID: fix-pause-and-accordion
Agent: 主代理
Task: 修复暂停按钮（高 DPI 浏览器不响应）+ 章节卡片 accordion 收缩展开动画

Work Log:
- 诊断暂停按钮根因：canvas 左上角热区 hotZone=60 是 canvas 内部坐标（已乘 DPR），
  在高 DPI 屏幕（Mac Retina DPR=2 / 移动端 DPR=3）上实际只有 30/20 屏幕像素，
  几乎无法点中。之前两次修复（pointer-events）未触及根因。
- 修复 1：hotZone 按 devicePixelRatio 缩放
  - src/components/phigros/emulator/script.phigros.emulator.ts 第 405 行
  - `const hotZone = 80 * (devicePixelRatio || 1);`（同时从 60 提升到 80 基准）
  - 确保在任何 DPR 下热区都是 80 屏幕像素
- 修复 2：新增可见暂停按钮（左上角 DOM button）
  - src/components/phigros/PhigrosEmulator.tsx
    - 新增 gameStarted state（tapToStart 点击后设 true）
    - 新增 handlePauseClick → emulatorRef.current.pauseToggle()
    - JSX 渲染 .wp-pauseBtn > .wp-pauseIcon（|| 图标用 ::before/::after 两条竖线）
  - src/styles/phigros.css
    - .wp-pauseBtn: fixed top:12 left:12, 44x44, rgba(0,0,0,0.45) + backdrop-filter blur
    - z-index:50（高于 canvas:1，低于 pauseOverlay:999）
    - .while-playing-root > .wp-pauseBtn 加 pointer-events:auto（父容器是 none）
    - hover 背景加深、active scale(0.92) 反馈
    - 图标 18x20px，两条 5px 竖线，间距 6px（避免小尺寸下误认为 N/H）
- 实现 accordion 收缩展开（参考 phigros-on-html home.css .select.focus）
  - src/app/chapter-select/page.tsx
    - 新增 expandedCard state（默认 'single'）
    - handleChapterClick: 未展开→仅展开不跳转；已展开→执行原跳转逻辑
    - handleZipCardClick: 未展开→仅展开
    - JSX 传 expanded prop 给 ChapterCard 和 ZipUploadCard
  - src/components/phigros/ChapterCard.tsx
    - 新增 expanded prop（默认 true）
    - className 根据 expanded 加 cs-expanded / cs-collapsed
  - src/components/phigros/ZipUploadCard.tsx
    - 新增 expanded prop + onExpand 回调
    - handleClick: 未展开→onExpand()；已展开→inputRef.click()
    - className 加 cs-expanded / cs-collapsed
  - src/styles/phigros.css
    - .cs-chapterContainer 加 transition: width 0.6s cubic-bezier + box-shadow 0.6s
    - .cs-expanded: width 85vh（默认）
    - .cs-collapsed: width 28vh + cursor:pointer
    - .cs-collapsed::after: opacity:0 + pointer-events:none（PLAY 按钮淡出）
    - .cs-chapterContainer::after: transition: opacity 0.4s

Stage Summary:
- Lint: 0 errors ✅
- 暂停按钮修复验证（agent-browser）:
  - 可见暂停按钮: click → pauseOverlay.visable + btnPause="继续" ✅
  - canvas 热区 (70,70): click → 暂停 ✅（之前 60px 阈值在此位置不触发）
  - Shift 键: keydown → 暂停 ✅
  - resumeBtn: click → 恢复 ✅
- accordion 验证（agent-browser + VLM）:
  - 默认: 单曲 精选集 expanded(733px) + ZIP collapsed(322px) ✅
  - click ZIP → ZIP expanded(733px,光圈完整) + 单曲 精选集 collapsed(322px,窄条) ✅
  - click 单曲 精选集 → 单曲 精选集 expanded + ZIP collapsed ✅
  - click 已展开的单曲 精选集 → 跳转 /song-select?c=single ✅
- 两段式交互: 第一次点击展开，第二次点击进入（与 phigros-on-html 一致）
- 产出/修改文件:
  - src/components/phigros/emulator/script.phigros.emulator.ts（hotZone DPR 缩放）
  - src/components/phigros/PhigrosEmulator.tsx（可见暂停按钮）
  - src/components/phigros/ChapterCard.tsx（expanded prop）
  - src/components/phigros/ZipUploadCard.tsx（expanded + onExpand prop）
  - src/app/chapter-select/page.tsx（accordion 状态管理）
  - src/styles/phigros.css（wp-pauseBtn 样式 + cs-collapsed/expanded 过渡）

---
Task ID: fix-pause-remove-dom-btn
Agent: 主代理
Task: 删除自作主张添加的 DOM 暂停按钮，恢复原版 canvas 热区方案并放大

Work Log:
- 用户反馈：出现两个暂停图标（canvas 上原版画的 Pause.png + 我加的 DOM .wp-pauseBtn）
- 查原版 phigros-html5/script.phigros.emulator.js 第 1546 行：
    ctxos.drawImage(res["Pause"], lineScale*0.6, lineScale*0.7, lineScale*0.63, lineScale*0.7)
  原版暂停图标是画在 canvasos 上的，配合 lineScale*1.5 热区点击。
- 删除我添加的 DOM 暂停按钮：
  - src/components/phigros/PhigrosEmulator.tsx: 移除 gameStarted state / handlePauseClick / .wp-pauseBtn JSX
  - src/styles/phigros.css: 移除 .wp-pauseBtn / .wp-pauseIcon 全部样式 + pointer-events 规则
- 恢复原版热区逻辑并放大：
  - src/components/phigros/emulator/script.phigros.emulator.ts 第 403 行
  - 原: const hotZone = 80 * (devicePixelRatio || 1)  ← 我之前瞎改的
  - 新: const hotZone = lineScale * 3  ← 基于原版 lineScale*1.5 放大 2 倍
  - lineScale 已含 DPR（由 canvasos.width/height 计算），无需额外 DPR 缩放
  - 热区从原版 ~57 CSS px 放大到 ~115 CSS px，点击容易得多

Stage Summary:
- Lint: 0 errors ✅
- agent-browser 验证:
  - DOM 暂停按钮已删除（domPauseBtnExists: false）✅
  - canvas 左上角点击 (40,41) → 暂停成功 ✅
  - (80,80) → 暂停成功 ✅（放大后的热区）
  - (100,100) → 暂停成功 ✅（之前 60px 阈值不触发）
  - resumeBtn → 恢复成功 ✅
- VLM 验证: upper-left corner exactly ONE pause icon ✅
- 教训：改之前先看原项目怎么做的，不要自作主张加 DOM 元素覆盖原版 canvas 绘制
