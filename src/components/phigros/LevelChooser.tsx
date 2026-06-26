'use client';

/**
 * Phi.ts — LevelChooser（4 难度选择器）
 *
 * 源自 phigros-html5/songSelect/index.html + index.js (changeLevel) + style.css
 *
 * 原版 DOM：
 *   <div class="levelChooser">
 *     <div class="levelItem ez selected" data-level="1" />
 *     <div class="levelItem hd" data-level="2" />
 *     <div class="levelItem in" data-level="3" />
 *     <div class="levelItem at" data-level="4" />
 *   </div>
 *
 * 原版 changeLevel(event) 动画流程：
 *   1. 旧 selected 加 fadeOut 类（animation: fade 0.3s ease-in，opacity 1→0）
 *   2. **同步**移除所有 fadeOut 类（原版 bug：cleanup 在 setTimeout 之前执行，
 *      实际 fadeOut 立即被移除，动画不播放）
 *   3. 300ms 后：旧 selected 移除 selected，新选中加 fadeIn + selected
 *      （fadeIn: animation: fade 0.3s ease-in reverse，opacity 0→1）
 *   4. switchLevel 立即更新所有 songItem 的难度显示
 *
 * 迁移为 React 后：
 *   - selectedLevel prop 控制 .selected 类归属
 *   - pendingLevel prop 控制 .fadeIn 类（300ms 动画期间）
 *   - 父组件负责：setDisplayLevel(new) 立即触发 songList 更新，
 *     setTimeout 300ms 后 setChooserLevel(new) + setPendingLevel(null)
 *
 * data-level 更新（原版 SongList.switchSong 内）：
 *   选中歌曲时，4 个 levelItem 的 data-level 同步更新为当前歌的 4 个难度定数。
 *   本实现通过 songMeta prop 自动派生（React 重渲染）。
 *
 * 难度色（原版 style.css）：
 *   - ez #51af44 / hd #3173b3 / in #be2d23 / at #3a3637
 *   - 选中 levelItem: height 120% + 对应难度色背景 + 白字
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { difficultyList, type Difficulty } from '@/lib/phigros/constants';
import type { SongMeta } from './SongList';

export interface LevelChooserProps {
  /** 当前选中的难度（驱动 .selected 类） */
  selectedLevel: Difficulty;
  /** 正在淡入的难度（300ms 动画期间，驱动 .fadeIn 类；null 表示无动画） */
  pendingLevel: Difficulty | null;
  /** 当前选中歌曲的 meta（用于派生 4 个难度定数 data-level） */
  songMeta: SongMeta | null;
  /** 选择难度回调 */
  onSelectLevel: (level: Difficulty) => void;
}

/**
 * 4 难度选择器组件
 *
 * 渲染 ez/hd/in/at 四个 levelItem，点击触发动画 + 切换。
 */
export function LevelChooser({
  selectedLevel,
  pendingLevel,
  songMeta,
  onSelectLevel,
}: LevelChooserProps) {
  return (
    <div className="levelChooser" role="radiogroup" aria-label="难度选择">
      {difficultyList.map((level) => {
        // data-level = Math.floor(meta[`${level}Ranking`])
        // 原版 SongList.switchSong 内的 select() 同步更新所有 levelItem 的 data-level
        const ranking = songMeta
          ? Math.floor(Number(songMeta[`${level}Ranking`]) || 0)
          : 0;

        const classes = ['levelItem', level];
        if (level === selectedLevel) classes.push('selected');
        if (level === pendingLevel) classes.push('fadeIn');

        return (
          <div
            key={level}
            className={classes.join(' ')}
            data-level={ranking}
            onClick={() => onSelectLevel(level)}
            role="radio"
            tabIndex={0}
            aria-checked={level === selectedLevel}
            aria-label={`难度 ${level.toUpperCase()} 定数 ${ranking}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectLevel(level);
              }
            }}
          />
        );
      })}
    </div>
  );
}
