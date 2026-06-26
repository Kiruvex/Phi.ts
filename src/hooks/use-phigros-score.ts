'use client';

/**
 * Phi.ts — 成绩读取/写入 hook
 *
 * 源自 phigros-html5 (MPL-2.0) by lchzh3473 & HanHan233
 *
 * 封装 score-codec 的操作，提供 React 友好的接口。
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { useCallback } from 'react';
import {
  loadAllScores,
  saveScore,
  getBestScore,
  type ScoreData,
} from '@/lib/phigros/score-codec';

/**
 * 成绩管理 hook
 *
 * 使用示例：
 * ```tsx
 * const { getBest, save, loadAll } = usePhigrosScore();
 *
 * // 读取历史最高分
 * const best = getBest(chartId); // "0009999" 或 null
 *
 * // 保存新成绩
 * const [isNewRecord, scoreBest, delta, isAuto] = save(chartId, 0.99, 999650, 2, false);
 *
 * // 读取所有成绩
 * const all = loadAll(); // Record<id, ScoreData>
 * ```
 */
export function usePhigrosScore() {
  /** 获取某谱面历史最高分字符串（7 位补零），无记录返回 null */
  const getBest = useCallback((id: string): string | null => {
    return getBestScore(id);
  }, []);

  /**
   * 写入成绩（更新或新增）
   * @returns [isNewRecord, scoreBestStr, deltaStr, isAuto]
   */
  const save = useCallback(
    (
      id: string,
      acc: number,
      score: number,
      level: number,
      isAuto: boolean,
    ): [boolean, string, string, boolean] => {
      return saveScore(id, acc, score, level, isAuto);
    },
    [],
  );

  /** 从 localStorage 读取所有成绩记录（解码后） */
  const loadAll = useCallback((): Record<string, ScoreData> => {
    return loadAllScores();
  }, []);

  return { getBest, save, loadAll };
}
