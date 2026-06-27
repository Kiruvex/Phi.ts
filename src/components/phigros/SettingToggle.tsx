'use client';

/**
 * Phi.ts — SettingToggle
 *
 * 源自 phigros-html5/settings/index.js (toggle click 逻辑) + style.css (div.toggle)
 *
 * 1:1 对齐原版视觉效果：
 *   - 65px × 25px 黑色容器，30px 白色方块作为开关
 *   - .checked 时白块靠右，::after 显示 "√"
 *
 * 与原版的差异：
 *   - 原版用 classList 切换 checked + 直接写 localStorage；本组件受控于 currentValue，
 *     onChange 回调父组件委托给 setSetting。
 *
 * 持久化：onChange → usePhigrosSettings.setSetting → zustand persist → localStorage
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { useCallback } from 'react';
import { playClickSound } from '@/lib/phigros/page-transition';

export interface SettingToggleProps {
  /** localStorage codename（仅作标记，不直接操作存储） */
  codename: string;
  /** 设置项标题 */
  label: string;
  /** 当前值（来自 usePhigrosSettings） */
  currentValue: boolean;
  /** 值变更回调 */
  onChange: (value: boolean) => void;
}

export function SettingToggle({
  codename,
  label,
  currentValue,
  onChange,
}: SettingToggleProps) {
  const handleClick = useCallback(() => {
    playClickSound();
    onChange(!currentValue);
  }, [currentValue, onChange]);

  return (
    <div className="item">
      <div
        className="title"
        data-name={label}
        data-codename={codename}
      />
      <div
        className={`toggle${currentValue ? ' checked' : ''}`}
        role="switch"
        aria-label={label}
        aria-checked={currentValue}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      />
    </div>
  );
}
