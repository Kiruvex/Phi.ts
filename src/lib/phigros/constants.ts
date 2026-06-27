/**
 * Phi.ts — 全局常量
 *
 * 源自 phigros-html5 (MPL-2.0) by lchzh3473 & HanHan233
 * 参考: phigros-html5/constants.js
 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

/** 难度索引映射（与原版 gameLevels 一致） */
export const gameLevels = {
  ez: 0,
  hd: 1,
  in: 2,
  at: 3,
} as const;

/** 难度列表（有序） */
export const difficultyList = ['ez', 'hd', 'in', 'at'] as const;
export type Difficulty = (typeof difficultyList)[number];

/** 难度显示名 */
export const difficultyNames: Record<Difficulty, string> = {
  ez: 'EZ',
  hd: 'HD',
  in: 'IN',
  at: 'AT',
};

/** 难度对应色（原版 songSelect style.css 中的颜色） */
export const difficultyColors: Record<Difficulty, string> = {
  ez: '#51af44',
  hd: '#3173b3',
  in: '#be2d23',
  at: '#3a3637',
};

/** URL 参数名常量（与原版跳转 URL 参数语义一致） */
export const URL_PARAMS = {
  play: 'play', // 谱面 codename
  level: 'l', // 难度 ez/hd/in/at
  chapter: 'c', // 章节 codename
  score: 'score', // 结算分数（7 位补零字符串）
  maxCombo: 'mc', // 最大连击
  perfect: 'p', // Perfect 总数 (PE+PM+PL)
  good: 'g', // Good 总数 (GE+GL)
  bad: 'b', // Bad Early 数
  miss: 'm', // Bad Late（实际是 Miss）数
  early: 'e', // Good Early 数（用于 Early/Late 统计）
} as const;

/** localStorage 键名常量 */
export const STORAGE_KEYS = {
  /** 最佳成绩（40 字符段乱序拼接） */
  phi: 'phi',
  /** 以下为 13 个设置项（键名沿用原版 codename，保证向后兼容） */
  inputOffset: 'input-offset',
  selectScaleRatio: 'select-scale-ratio',
  selectGlobalAlpha: 'select-global-alpha',
  selectAspectRatio: 'select-aspect-ratio',
  hitSong: 'hitSong',
  highLight: 'highLight',
  autoFullscreen: 'autoFullscreen',
  lineColor: 'lineColor',
  hyperMode: 'hyperMode',
  imageBlur: 'imageBlur',
  feedback: 'feedback',
  showPoint: 'showPoint',
  showTransition: 'showTransition',
  autoPlay: 'autoPlay',
} as const;

/**
 * 设置项默认值
 *
 * 注意: select-scale-ratio 存真实缩放值（1e4/9e3/8e3/7e3/6e3），
 * select-global-alpha 存真实 alpha 值（1/0.8/0.6/0.4/0.2）。
 * 这是相对原版的 bug 修复（原版 settings 存档位索引，隐藏 select 存真实值，两套不统一）。
 */
export const SETTING_DEFAULTS = {
  [STORAGE_KEYS.inputOffset]: 0,
  [STORAGE_KEYS.selectScaleRatio]: 8000,
  [STORAGE_KEYS.selectGlobalAlpha]: 0.6,
  [STORAGE_KEYS.selectAspectRatio]: 1.777778, // 16:9
  [STORAGE_KEYS.hitSong]: true,
  [STORAGE_KEYS.highLight]: true,
  [STORAGE_KEYS.autoFullscreen]: true,
  [STORAGE_KEYS.lineColor]: false,
  [STORAGE_KEYS.hyperMode]: false,
  [STORAGE_KEYS.imageBlur]: true,
  [STORAGE_KEYS.feedback]: false,
  [STORAGE_KEYS.showPoint]: false,
  [STORAGE_KEYS.showTransition]: true,
  [STORAGE_KEYS.autoPlay]: false,
} as const;

/** 按键缩放档位（原版隐藏 select 的 option 值） */
export const SCALE_RATIO_OPTIONS = [
  { label: '极小', value: 10000 },
  { label: '较小', value: 9000 },
  { label: '默认', value: 8000 },
  { label: '较大', value: 7000 },
  { label: '极大', value: 6000 },
] as const;

/** 背景亮度档位（原版隐藏 select 的 option 值） */
export const GLOBAL_ALPHA_OPTIONS = [
  { label: '黑暗', value: 1 },
  { label: '昏暗', value: 0.8 },
  { label: '默认', value: 0.6 },
  { label: '较亮', value: 0.4 },
  { label: '明亮', value: 0.2 },
] as const;

/** 画面宽高比档位（原版隐藏 select 的 option 值，bug 修复后真正生效） */
export const ASPECT_RATIO_OPTIONS = [
  { label: '5:4', value: 1.25 },
  { label: '4:3', value: 1.333333 },
  { label: '10:7', value: 1.428571 },
  { label: '19:13', value: 1.461538 },
  { label: '8:5', value: 1.6 },
  { label: '5:3', value: 1.666667 },
  { label: '22:13', value: 1.692308 },
  { label: '16:9', value: 1.777778 },
] as const;

/** 谱面延时范围（原版 settings slider: data-total=1000, 范围 -500~500） */
export const INPUT_OFFSET_RANGE = { min: -500, max: 500, step: 5 } as const;

/** 评级阈值（原版 LevelOver/index.js 的评级逻辑） */
export const RANK_THRESHOLDS = {
  phi: 1000000,
  v: 960000,
  s: 920000,
  a: 880000,
  b: 820000,
  c: 700000,
} as const;

/** 评级图文件名映射 */
export const RANK_IMAGES: Record<string, string> = {
  phi: 'phi15phi.png',
  v: 'V15V.png',
  vfc: 'V15FC.png',
  s: 'S15S.png',
  a: 'A15A.png',
  b: 'B15B.png',
  c: 'C15C.png',
  f: 'F15F.png',
};

/** noteRank 索引含义（原版 stat 对象注释: 4:PM,5:PE,1:PL,7:GE,3:GL,6:BE,2:BL） */
export const NOTE_RANK = {
  perfectLate: 1, // PL
  badLate: 2, // BL (实际是 Miss)
  goodLate: 3, // GL
  perfectMax: 4, // PM
  perfectEarly: 5, // PE
  badEarly: 6, // BE
  goodEarly: 7, // GE
} as const;
