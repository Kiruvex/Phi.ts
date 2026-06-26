'use client';

/**
 * Phi.ts — ScoreDisplay（分数显示）
 *
 * 源自 phigros-html5/songSelect/style.css + index.html
 *
 * 原版 songSelect 页面右侧 detailBar 中的 score div 仅为 UI 占位：
 *   <div class="score unplayed" data-acc="00.00%">0000000</div>
 *
 * 原版 songSelect 阶段并不读取历史成绩（localStorage.phi），历史成绩只在
 * whilePlaying 结算时由 LevelOver 页面写入。此处保持占位行为：
 *   - 默认显示 "0000000"
 *   - 添加 .unplayed 类，::after 显示 "NEW"
 *   - data-acc="00.00%"（::before 显示精度，占位 0%）
 *
 * TODO（未来增强）：可以在此读取 getBestScore(md5Id) 显示历史最高分，
 * 但 songSelect 阶段可能没有 md5（需要谱面 hash 计算），且原版行为是占位，
 * 故此处不对齐原版之外的功能。
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export interface ScoreDisplayProps {
  /** 可选 className 覆盖（默认 'score unplayed'） */
  className?: string;
}

/**
 * 分数显示占位组件
 *
 * 使用方式：
 * ```tsx
 * <ScoreDisplay />
 * ```
 */
export function ScoreDisplay({ className }: ScoreDisplayProps) {
  return (
    <div
      className={className ?? 'score unplayed'}
      data-acc="00.00%"
      aria-label="历史最高分（占位）"
    >
      0000000
    </div>
  );
}
