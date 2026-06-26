'use client';

/**
 * Phi.ts — SongList（歌单容器组件）
 *
 * 源自 phigros-html5/songSelect/SongList.js
 *
 * 原版 SongList 工厂返回 { element, items, createSong, switchSong, switchLevel }：
 *   - element: div.songList#songList（margin-top/bottom:100px, overflow:hidden）
 *   - createSong(id, songMeta, codename): 创建 SongContainer 添加到 listElement
 *   - switchSong(id): 切换选中（播放 Tap5 + fetch illustration + 切片音频）
 *   - switchLevel(newLevel): 更新所有 songItem 的难度显示
 *
 * 迁移为 React 组件后：
 *   - 列表渲染改为 map(items)（createSong 不再需要）
 *   - 选中态由 selectedIndex prop 控制（switchSong 由父组件触发副作用）
 *   - level prop 驱动所有 SongItem 的难度显示（switchLevel 改为 prop 变化自动重渲染）
 *   - 滚动通过 topOffset prop 修改 songList 的 top（position:absolute）
 *
 * 1:1 对齐原版 DOM：
 *   <div id="songList" class="songList" style="position:absolute; top:{100 + topOffset}px">
 *     <SongItem ... /> × N
 *   </div>
 *
 * 滚动机制（原版 index.js）：
 *   - wheel: newYCoord = yCoord - deltaY/8（原版用 wheelDeltaY/8，符号取反适配现代 API）
 *   - 到顶不可再向上：if (newYCoord <= 0 || deltaY > 0) 才允许应用
 *   - 原版初始无 position:absolute，首次滚动时才设置；本实现始终 position:absolute，
 *     topOffset 初始 0 + CSS padding-top:100px 等价于原版的 margin-top:100px，避免首次滚动的视觉跳变
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { SongItem } from './SongItem';
import type { Difficulty } from '@/lib/phigros/constants';

/** 谱面元数据（meta.json 反序列化结果，仅声明本组件用到的字段） */
export interface SongMeta {
  name: string;
  codename: string;
  artist: string;
  musicFile: string;
  illustration: string;
  /** 切片音频起始时间（秒，meta.json 中为字符串） */
  sliceAudioStart?: string | number;
  /** 4 个难度的定数 */
  ezRanking: number;
  hdRanking: number;
  inRanking: number;
  atRanking: number;
  /** 允许任意额外字段，用索引签名 */
  [key: string]: unknown;
}

/** 单曲条目数据 */
export interface SongListItem {
  meta: SongMeta;
  codename: string;
}

export interface SongListProps {
  /** 歌单项列表 */
  items: SongListItem[];
  /** 当前选中项索引（null 表示无选中） */
  selectedIndex: number | null;
  /** 当前显示难度（驱动所有 SongItem 的 level div） */
  level: Difficulty;
  /** 滚动偏移量（px，负值表示向下滚动） */
  topOffset: number;
  /** 选中歌曲回调 */
  onSelect: (index: number) => void;
}

/**
 * 歌单容器组件
 *
 * 渲染 div.songList#songList，内部 map 出 SongItem 列表。
 * 滚动通过 inline style 的 top 实现（position:absolute）。
 */
export function SongList({
  items,
  selectedIndex,
  level,
  topOffset,
  onSelect,
}: SongListProps) {
  return (
    <div
      id="songList"
      className="songList"
      style={{
        position: 'absolute',
        // 原版 CSS: margin-top:100px（自然流）+ JS 设置 position:absolute;top:${yCoord}px
        // 本实现：始终 position:absolute，top = 100 + topOffset（等价于原版的自然流初始位置）
        top: `${100 + topOffset}px`,
      }}
      role="listbox"
      aria-label="歌曲列表"
    >
      {items.map((item, i) => (
        <SongItem
          key={item.codename}
          meta={item.meta}
          codename={item.codename}
          level={level}
          isSelected={i === selectedIndex}
          onSelect={() => onSelect(i)}
        />
      ))}
    </div>
  );
}
