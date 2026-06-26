/**
 * Phi.ts — 成绩字符串编解码
 *
 * 源自 phigros-html5 (MPL-2.0) by lchzh3473 & HanHan233
 * 参考: phigros-html5/whilePlaying/script.phigros.emulator.js 第 780-879 行 (stat 对象)
 *
 * 编码格式（localStorage.phi）：
 *   若干段 40 字符字符串乱序拼接。每段 40 字符：
 *   - 前 32 字符：谱面 md5 id
 *   - 接下来 3 字符：acc 的 base22 编码（Math.round(acc*1e4+566).toString(22).slice(-3)）
 *   - 接下来 4 字符：score 的 base32 编码（Math.round(score+40672).toString(32).slice(-4)）
 *   - 最后 1 字符：level 的 base36 编码（level.toString(36).slice(-1)）
 *
 * 写入时所有段会被随机乱序（arr.sort(() => Math.random() - 0.5)）以增加混淆。
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { STORAGE_KEYS } from './constants';

/** 成绩数据（解码后的结构化形式） */
export interface ScoreData {
  /** 准确率 0~1 */
  acc: number;
  /** 分数 0~1000000 */
  score: number;
  /** 难度索引 0~3 (ez/hd/in/at) */
  level: number;
}

/** 单条记录后缀长度（acc3 + score4 + level1） */
const SUFFIX_LENGTH = 8;
/** 单条记录总长度（id 32 + 后缀 8） */
const RECORD_LENGTH = 40;
/** id 长度 */
const ID_LENGTH = 32;

/** score 编码偏移量 */
const SCORE_OFFSET = 40672;
/** acc 编码偏移量 */
const ACC_OFFSET = 566;
/** acc 编码缩放因子 */
const ACC_SCALE = 1e4;

/**
 * 编码单条成绩为 8 字符后缀（acc3 + score4 + level1）
 *
 * 1:1 对齐原版 stat.localData getter：
 *   l1 = Math.round(accNum * 1e4 + 566).toString(22).slice(-3)
 *   l2 = Math.round(scoreNum + 40672).toString(32).slice(-4)
 *   l3 = Number(level.match(/\d+$/)).toString(36).slice(-1)
 *
 * base22/base32/base36 同长度字符串的字典序与数值序一致，
 * 因此可直接用字符串比较取较大值。
 */
export function encodeScore(acc: number, score: number, level: number): string {
  const l1 = Math.round(acc * ACC_SCALE + ACC_OFFSET).toString(22).slice(-3);
  const l2 = Math.round(score + SCORE_OFFSET).toString(32).slice(-4);
  const l3 = Math.round(level).toString(36).slice(-1);
  return l1 + l2 + l3;
}

/**
 * 解码 8 字符后缀为 ScoreData
 *
 * 与 encodeScore 互为反函数（解码值再编码会得到相同后缀）。
 */
export function decodeScore(suffix: string): ScoreData {
  const s1 = suffix.slice(0, 3);
  const s2 = suffix.slice(3, 7);
  const s3 = suffix.slice(7, 8);
  const accNum = parseInt(s1, 22);
  const scoreNum = parseInt(s2, 32);
  const levelNum = parseInt(s3, 36);
  return {
    acc: Number.isNaN(accNum) ? 0 : (accNum - ACC_OFFSET) / ACC_SCALE,
    score: Number.isNaN(scoreNum) ? 0 : scoreNum - SCORE_OFFSET,
    level: Number.isNaN(levelNum) ? 0 : levelNum,
  };
}

/**
 * 从 localStorage.phi 读取所有成绩记录（原始后缀形式）
 *
 * 内部使用，供 saveScore 进行字符串比较。
 *
 * 1:1 对齐原版 stat.reset() 中的解析逻辑：
 *   for (let i = 0; i < parseInt(str.length / 40); i++) {
 *     data[str.slice(i*40, i*40+32)] = str.slice(i*40+32, i*40+40)
 *   }
 */
function loadRawScores(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const str = window.localStorage.getItem(STORAGE_KEYS.phi) ?? '';
  const data: Record<string, string> = {};
  const count = Math.floor(str.length / RECORD_LENGTH);
  for (let i = 0; i < count; i++) {
    const start = i * RECORD_LENGTH;
    const id = str.slice(start, start + ID_LENGTH);
    const suffix = str.slice(start + ID_LENGTH, start + RECORD_LENGTH);
    if (id && suffix.length === SUFFIX_LENGTH) {
      data[id] = suffix;
    }
  }
  return data;
}

/**
 * 将所有成绩记录写回 localStorage.phi（带乱序）
 *
 * 1:1 对齐原版 stat.getData() 中的写入逻辑：
 *   const arr = [];
 *   for (const i in this.data) arr.push(i + this.data[i]);
 *   localStorage.setItem("phi", arr.sort(() => Math.random() - 0.5).join(""));
 */
function saveRawScores(data: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  const arr: string[] = [];
  for (const id in data) {
    arr.push(id + data[id]);
  }
  // 乱序拼接（与原版一致，增加混淆）
  arr.sort(() => Math.random() - 0.5);
  window.localStorage.setItem(STORAGE_KEYS.phi, arr.join(''));
}

/**
 * 从 localStorage.phi 读取所有成绩记录（解码后）
 *
 * @returns Record<谱面id, ScoreData>
 */
export function loadAllScores(): Record<string, ScoreData> {
  const raw = loadRawScores();
  const result: Record<string, ScoreData> = {};
  for (const id in raw) {
    result[id] = decodeScore(raw[id]);
  }
  return result;
}

/**
 * 将 7 位补零分数字符串转为数字
 * @param str 7 位补零字符串（如 "0009999"）
 */
function parseScoreStr(str: string): number {
  const n = Number(str);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * 写入成绩（更新或新增）
 *
 * 1:1 对齐原版 stat.getData(isAuto) 逻辑：
 * - 读取现有记录；若不存在，用零值初始化（对应原版 reset 中 data[id] = localData）
 * - 字符串比较取较大值: data[id] = (s1 > l1 ? s1 : l1) + (s2 > l2 ? s2 : l2) + l3
 * - isAuto 时不写入，返回 [false, scoreBest, "", true]
 * - 非 isAuto 返回 [s2 < l2, scoreBest, (s2 > l2 ? "- " : "+ ") + Math.abs(scoreBest - scoreStr), false]
 *
 * @param id 谱面 md5（32 字符）
 * @param acc 准确率 0~1
 * @param score 分数 0~1000000（可为浮点，内部取整）
 * @param level 难度索引 0~3
 * @param isAuto 是否为自动模式（Auto 模式不写入成绩）
 * @returns [isNewRecord, scoreBestStr, deltaStr, isAuto]
 *   - isNewRecord: 本次成绩是否打破历史最高分（s2 < l2，即旧分 < 新分）
 *   - scoreBestStr: 历史最高分（7 位补零字符串，保存前的旧值）
 *   - deltaStr: 差值字符串（"+ N" 表示提升 N 分，"- N" 表示落后 N 分；Auto 模式为空）
 *   - isAuto: 是否为 Auto 模式
 */
export function saveScore(
  id: string,
  acc: number,
  score: number,
  level: number,
  isAuto: boolean,
): [boolean, string, string, boolean] {
  const data = loadRawScores();

  // 若不存在则用零值初始化（对应原版 reset 中 data[id] = localData）
  if (!data[id]) {
    data[id] = encodeScore(0, 0, level);
  }

  const existing = data[id];
  const s1 = existing.slice(0, 3); // 旧 acc
  const s2 = existing.slice(3, 7); // 旧 score

  const newSuffix = encodeScore(acc, score, level);
  const l1 = newSuffix.slice(0, 3); // 新 acc
  const l2 = newSuffix.slice(3, 7); // 新 score
  const l3 = newSuffix.slice(7, 8); // 新 level（总是用最新难度）

  // 计算历史最高分字符串（7 位补零）
  // 1:1 对齐: a = (parseInt(s2, 32) - 40672).toFixed(0); scoreBest = a.padStart(7, '0')
  const scoreBestNum = (parseInt(s2, 32) - SCORE_OFFSET).toFixed(0);
  const scoreBest = scoreBestNum.padStart(7, '0');

  if (isAuto) {
    // Auto 模式：不写入，返回空 delta
    return [false, scoreBest, '', true];
  }

  // 取较大值（字符串比较，base22/base32 同长度字典序与数值序一致）
  data[id] = (s1 > l1 ? s1 : l1) + (s2 > l2 ? s2 : l2) + l3;
  saveRawScores(data);

  // 本次分数字符串（7 位补零），1:1 对齐 stat.scoreStr getter
  const scoreStr = score.toFixed(0).padStart(7, '0');

  // delta: 1:1 对齐 (s2 > l2 ? "- " : "+ ") + Math.abs(scoreBest - scoreStr)
  // - s2 > l2: 旧分 > 新分（未打破记录）→ "- diff"（落后 diff 分）
  // - s2 <= l2: 旧分 <= 新分（打破或持平记录）→ "+ diff"（提升 diff 分）
  const deltaSign = s2 > l2 ? '- ' : '+ ';
  const delta = deltaSign + Math.abs(parseScoreStr(scoreBest) - parseScoreStr(scoreStr));

  // isNewRecord: s2 < l2 即旧分 < 新分
  return [s2 < l2, scoreBest, delta, false];
}

/**
 * 获取某谱面历史最高分字符串（7 位补零）
 *
 * @param id 谱面 md5（32 字符）
 * @returns 7 位补零字符串，若无记录返回 null
 */
export function getBestScore(id: string): string | null {
  const raw = loadRawScores();
  if (!raw[id]) return null;
  const s2 = raw[id].slice(3, 7);
  const scoreBestNum = (parseInt(s2, 32) - SCORE_OFFSET).toFixed(0);
  return scoreBestNum.padStart(7, '0');
}
