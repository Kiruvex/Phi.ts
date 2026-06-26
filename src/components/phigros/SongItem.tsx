'use client';

/**
 * Phi.ts — SongItem（单曲条目）
 *
 * 源自 phigros-html5/songSelect/SongList.js
 *   - SongItem(songMeta, codename): div.songItem[data-artist][data-codename] innerText=name
 *   - SongLevel(songMeta, level): div.level.${level}[data-level=Math.floor(ranking)]
 *   - SongContainer: div.songItemContainer > (songItem + songLevel)，选中态切换
 *
 * 1:1 对齐原版 DOM 结构：
 *   <div class="songItemContainer[ selected]">
 *     <div class="songItem[ selected]" data-artist="..." data-codename="...">
 *       {songMeta.name}
 *     </div>
 *     <div class="level {level}" data-level="{Math.floor(ranking)}" />
 *   </div>
 *
 * 选中态样式（原版 style.css）：
 *   - songItemContainer.selected: 高 50px、font-size 36px、黑底 0.85、translateX(-50%) 居中
 *   - songItem.selected: flex column，::after 显示 data-artist
 *   - level（选中态）: height 150%、白底、显示难度数字 + EZ/HD/IN/AT 标识
 *
 * 反倾斜：songItem 与 level 均带 transform: skew(15deg) 抵消父级 leftArea 的 skew(-15deg)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { SongMeta } from './SongList';
import type { Difficulty } from '@/lib/phigros/constants';

export interface SongItemProps {
  /** 谱面元数据 */
  meta: SongMeta;
  /** 谱面 codename（如 "sample"） */
  codename: string;
  /** 当前显示的难度（驱动 level div 的 class 与 data-level） */
  level: Difficulty;
  /** 是否选中 */
  isSelected: boolean;
  /** 点击回调 */
  onSelect: () => void;
}

/**
 * 单曲条目组件
 *
 * 由 SongList 渲染，受父级 leftArea 的 skew(-15deg) 影响，
 * 内部 songItem 与 level 用 skew(15deg) 反倾斜还原文字方向。
 */
export function SongItem({
  meta,
  codename,
  level,
  isSelected,
  onSelect,
}: SongItemProps) {
  // data-level = Math.floor(meta[`${level}Ranking`])（与原版 SongLevel.switchLevel 一致）
  const ranking = Math.floor(Number(meta[`${level}Ranking`]) || 0);

  const containerClass = `songItemContainer${isSelected ? ' selected' : ''}`;
  const songItemClass = `songItem${isSelected ? ' selected' : ''}`;

  return (
    <div
      className={containerClass}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`选择歌曲 ${meta.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div
        className={songItemClass}
        data-artist={meta.artist}
        data-codename={codename}
      >
        {meta.name}
      </div>
      <div className={`level ${level}`} data-level={ranking} />
    </div>
  );
}
