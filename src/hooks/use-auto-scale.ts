'use client';

/**
 * Phi.ts — 通用缩放 hook
 *
 * 源自 phigros-html5 (MPL-2.0) by lchzh3473 & HanHan233
 * 参考: phigros-html5/assets/autoScale.js
 *
 * 原版逻辑：
 *   document.body.children[0].style.transform = "scale(" + window.outerHeight/480 + ")"
 *
 * 本 hook 改用 window.innerHeight（更可靠，PWA 全屏模式下 outerHeight 行为不一致），
 * 监听 resize 事件自动更新目标元素的 transform: scale()。
 *
 * 使用示例：
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * useAutoScale(ref, 480);
 * return <div ref={ref} style={{ width: 854, height: 480 }}>...</div>;
 * ```
 *
 * 注意：transform-origin 默认为 center（CSS 默认值）。
 * 如需从左上角缩放，请在 CSS 中设置 `transform-origin: top left`。
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { useEffect, type RefObject } from 'react';

/**
 * 监听窗口尺寸变化，按 innerHeight / baseHeight 缩放目标元素
 *
 * @param targetRef 目标元素的 ref
 * @param baseHeight 基准高度（原版为 480），缩放比例 = window.innerHeight / baseHeight
 */
export function useAutoScale(
  targetRef: RefObject<HTMLElement | null>,
  baseHeight: number = 480,
): void {
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const applyScale = () => {
      const scale = window.innerHeight / baseHeight;
      target.style.transform = `scale(${scale})`;
    };

    // 首次应用
    applyScale();

    // 监听 resize
    window.addEventListener('resize', applyScale);

    return () => {
      window.removeEventListener('resize', applyScale);
    };
  }, [targetRef, baseHeight]);
}
