'use client';

/**
 * Phi.ts — ChapterCard 章节卡片组件
 *
 * 1:1 迁移自 phigros-html5/chapterSelect/index.html 中的 div.chapterContainer。
 *
 * 结构：
 *   <div.cs-chapterContainer data-name={name} data-codename={codename}>
 *     <img.cs-chapterImage src={image} />
 *   </div>
 *
 * 视觉：
 *   - 容器 skew(-15deg) 倾斜，图片 skew(15deg) translateX(-20%) 反倾斜
 *   - 右上角 ::before 伪元素显示 data-name（章节名）
 *   - 右下角 ::after 伪元素显示 "▷  P L A Y" + 渐变背景
 *
 * 点击行为（1:1 对齐原版 chapterSelect/index.js）：
 *   - 点击 img（e.target.src != null）→ 不触发（原版 if 分支）
 *   - 点击 div（::before/::after 区域或空白处）→ onClick(codename)（原版 else 分支）
 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { useCallback } from 'react';
import type { MouseEvent } from 'react';
import { playClickSound } from '@/lib/phigros/page-transition';

export interface ChapterCardProps {
  /** 章节显示名（如 "单曲 精选集"），显示在卡片右上角 ::before */
  name: string;
  /** 章节代号（如 "single"），用于跳转 URL 参数 ?c= */
  codename: string;
  /** 章节封面图 URL */
  image: string;
  /** 是否展开（accordion 模式：同时只有一张展开）。未展开时点击仅展开，不跳转 */
  expanded?: boolean;
  /** 点击章节（非图片区域）时的回调，参数为 codename */
  onClick: (codename: string) => void;
}

export default function ChapterCard({
  name,
  codename,
  image,
  expanded = true,
  onClick,
}: ChapterCardProps) {
  const handleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      // 原版逻辑：if (e.target.src != null) { /* Do Nothing */ } else { ... }
      // img 有 src 属性（字符串，!= null 为 true）→ 不触发
      // div 没有 src 属性（undefined，!= null 为 false，因 undefined == null）→ 触发
      const target = e.target as HTMLElement;
      if ((target as HTMLImageElement).src != null) {
        return;
      }
      playClickSound(); onClick(codename);
    },
    [codename, onClick],
  );

  return (
    <div
      className={`cs-chapterContainer${expanded ? ' cs-expanded' : ' cs-collapsed'}`}
      data-name={name}
      data-codename={codename}
      onClick={handleClick}
    >
      {/* 原版用 <img>，保持一致；Next/Image 不适用于这种 1:1 复刻场景 */}
      <img
        className="cs-chapterImage"
        src={image}
        alt={name}
        draggable={false}
      />
    </div>
  );
}
