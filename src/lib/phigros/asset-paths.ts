/**
 * Phi.ts — 资源路径常量
 *
 * 所有原版资源已迁移到 public/phigros/ 下，保持原目录结构。
 * 此文件集中管理所有资源路径，便于维护。
 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

/** 资源根路径 */
export const PHIGROS_BASE = '/phigros';

/** whilePlaying 模拟器内置资源 */
export const WHILEPLAYING_ASSETS = `${PHIGROS_BASE}/whilePlaying/assets`;

/** 谱面资源根路径 */
export const CHARTS_BASE = `${PHIGROS_BASE}/charts`;

/** 公共资源（字体/音频/图片） */
export const ASSETS_BASE = `${PHIGROS_BASE}/assets`;

/** 字体资源 */
export const FONTS_BASE = `${ASSETS_BASE}/fonts`;

/** 音频资源 */
export const AUDIO_BASE = `${ASSETS_BASE}/audio`;

/** 图片资源 */
export const IMAGES_BASE = `${ASSETS_BASE}/images`;

/** 章节封面图片 */
export const CHAPTER_IMAGES = `${IMAGES_BASE}/chapterImages`;

/** tapToStart 资源 */
export const TAP_TO_START_BASE = `${PHIGROS_BASE}/tapToStart`;

/** chapterSelect 资源 */
export const CHAPTER_SELECT_BASE = `${PHIGROS_BASE}/chapterSelect`;

/** aboutUs 资源 */
export const ABOUT_US_BASE = `${PHIGROS_BASE}/aboutUs`;

// ─── whilePlaying 内置资源 ──────────────────────────────

/** 模拟器内置 PNG（23 张） */
export const EMULATOR_IMAGES = {
  judgeLine: `${WHILEPLAYING_ASSETS}/JudgeLine.png`,
  progressBar: `${WHILEPLAYING_ASSETS}/ProgressBar.png`,
  songsNameBar: `${WHILEPLAYING_ASSETS}/SongsNameBar.png`,
  pause: `${WHILEPLAYING_ASSETS}/Pause.png`,
  rank: `${WHILEPLAYING_ASSETS}/Rank.png`,
  noImage: `${WHILEPLAYING_ASSETS}/0.png`,
  tap: `${WHILEPLAYING_ASSETS}/Tap.png`,
  tap2: `${WHILEPLAYING_ASSETS}/Tap2.png`,
  tapHL: `${WHILEPLAYING_ASSETS}/TapHL.png`,
  drag: `${WHILEPLAYING_ASSETS}/Drag.png`,
  dragHL: `${WHILEPLAYING_ASSETS}/DragHL.png`,
  holdHead: `${WHILEPLAYING_ASSETS}/HoldHead.png`,
  holdHeadHL: `${WHILEPLAYING_ASSETS}/HoldHeadHL.png`,
  hold: `${WHILEPLAYING_ASSETS}/Hold.png`,
  holdHL: `${WHILEPLAYING_ASSETS}/HoldHL.png`,
  holdEnd: `${WHILEPLAYING_ASSETS}/HoldEnd.png`,
  flick: `${WHILEPLAYING_ASSETS}/Flick.png`,
  flickHL: `${WHILEPLAYING_ASSETS}/FlickHL.png`,
  clickRaw: `${WHILEPLAYING_ASSETS}/clickRaw.png`,
  levelOver1: `${WHILEPLAYING_ASSETS}/LevelOver1.png`,
  levelOver3: `${WHILEPLAYING_ASSETS}/LevelOver3.png`,
  levelOver4: `${WHILEPLAYING_ASSETS}/LevelOver4.png`,
  levelOver5: `${WHILEPLAYING_ASSETS}/LevelOver5.png`,
  back7918: `${WHILEPLAYING_ASSETS}/Back7918.png`,
  retry: `${WHILEPLAYING_ASSETS}/Retry.png`,
  resume: `${WHILEPLAYING_ASSETS}/Resume.png`,
} as const;

/** 模拟器内置 OGG（4 个） */
export const EMULATOR_AUDIO = {
  mute: `${WHILEPLAYING_ASSETS}/mute.ogg`,
  hitSong0: `${WHILEPLAYING_ASSETS}/HitSong0.ogg`,
  hitSong1: `${WHILEPLAYING_ASSETS}/HitSong1.ogg`,
  hitSong2: `${WHILEPLAYING_ASSETS}/HitSong2.ogg`,
} as const;

/** 结算音乐（8 个：4 基础 + 4 个 _v2 变体） */
export const LEVEL_OVER_AUDIO = (difficulty: number, isV2 = false) =>
  `${WHILEPLAYING_ASSETS}/LevelOver${difficulty}${isV2 ? '_v2' : ''}.ogg`;

/** 外部库 */
export const EXTERNAL_LIBS = {
  oggmented: `${WHILEPLAYING_ASSETS}/oggmented-bundle.js`,
  stackblur: `${WHILEPLAYING_ASSETS}/stackblur.min.js`,
} as const;

// ─── 公共音频 ──────────────────────────────────────────

/** UI 点击音效 Tap1-7.wav */
export const TAP_AUDIO = (n: number) => `${AUDIO_BASE}/Tap${n}.wav`;

/** 结算音乐 LevelOver0-3.wav */
export const LEVEL_OVER_WAV = (difficulty: number) => `${AUDIO_BASE}/LevelOver${difficulty}.wav`;

// ─── 公共图片 ──────────────────────────────────────────

/** 评级图 */
export const RANK_IMAGE = (filename: string) => `${IMAGES_BASE}/${filename}`;

/** 背景图 */
export const INITIAL_BACKGROUND = `${IMAGES_BASE}/InitialBackground.png`;

/** Phigros logo */
export const PHIGROS_LOGO = `${IMAGES_BASE}/Phigros.png`;

/** 设置图标 */
export const SETTING_ICON = `${IMAGES_BASE}/setting.png`;

/** 返回按钮 */
export const BACK_ICON = `${IMAGES_BASE}/back.png`;
export const BACK_IN_RESULT_ICON = `${IMAGES_BASE}/backInResault.png`;
export const RETRY_ICON = `${IMAGES_BASE}/Retry.png`;

/** PWA 图标 */
export const APP_ICON = `${IMAGES_BASE}/app_icon.png`;
export const APP_ICON_576 = `${IMAGES_BASE}/app_icon_576x576.png`;

// ─── 谱面资源 ──────────────────────────────────────────

/** 章节歌曲列表文件 */
export const CHAPTER_LIST = (chapter: string) => `${CHARTS_BASE}/${chapter}.json`;

/** 谱面目录 */
export const CHART_DIR = (codename: string) => `${CHARTS_BASE}/${codename}`;

/** 谱面 meta.json */
export const CHART_META = (codename: string) => `${CHART_DIR(codename)}/meta.json`;

/** 谱面文件（JSON 或 PEC，文件名从 meta 中读取） */
export const CHART_FILE = (codename: string, filename: string) => `${CHART_DIR(codename)}/${filename}`;

/** 曲绘 */
export const CHART_ILLUSTRATION = (codename: string, filename: string) => `${CHART_DIR(codename)}/${filename}`;

/** 音乐 */
export const CHART_MUSIC = (codename: string, filename: string) => `${CHART_DIR(codename)}/${filename}`;

/** 判定线贴图配置 */
export const CHART_LINE_JSON = (codename: string) => `${CHART_DIR(codename)}/line.json`;

/** 判定线贴图图片 */
export const CHART_LINE_IMAGE = (codename: string, filename: string) => `${CHART_DIR(codename)}/${filename}`;

// ─── 页面专属资源 ──────────────────────────────────────

/** tapToStart 背景音乐 */
export const TOUCH_TO_START_AUDIO = `${TAP_TO_START_BASE}/TouchToStart0.mp3`;

/** chapterSelect 背景音乐 */
export const CHAPTER_SELECT_AUDIO = `${CHAPTER_SELECT_BASE}/ChapterSelect0.mp3`;

/** aboutUs 资源 */
export const ABOUT_US = {
  audio0: `${ABOUT_US_BASE}/AboutUs0.mp3`,
  audio1: `${ABOUT_US_BASE}/AboutUs1.mp3`,
  snrLogo: `${ABOUT_US_BASE}/snr.png`,
} as const;

/** tips.json */
export const TIPS_JSON = `${ASSETS_BASE}/tips.json`;

/** manifest */
export const MANIFEST = `${PHIGROS_BASE}/manifest.webmanifest`;

/** favicon */
export const FAVICON = `${PHIGROS_BASE}/favicon.ico`;

/** 字体 CSS */
export const FONTS_CSS = `${FONTS_BASE}/fonts.css`;
