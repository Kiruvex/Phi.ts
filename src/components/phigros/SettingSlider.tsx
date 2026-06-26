'use client';

/**
 * Phi.ts — SettingSlider
 *
 * 源自 phigros-html5/settings/index.js (slider click 逻辑) + style.css (div.slider)
 *
 * 1:1 对齐原版视觉效果：
 *   - 黑底容器，左右白色 35px +/- 按钮（skew(15deg)）
 *   - 中间白色 slideBlock，由 marginLeft 控制位置
 *   - 点击右侧 > width-35 → +1 档；点击左侧 < 35 → -1 档
 *
 * 与原版的差异（bug 修复）：
 *   - 原版按累计 marginLeft 控制位置（依赖每次点击增量），易漂移；本组件由 currentIndex
 *     直接计算 marginLeft，保证与 store 状态严格一致。
 *   - 原版边界 ±80% 是为 5 档 slider 设计的硬编码上限；本组件以 currentIndex 自然钳制
 *     在 [0, options.length-1]，边界由 onChange 触发前的范围检查保证。
 *   - 原版 data-value 显示数字索引；本组件显示 options[i].label（如 "默认" / "0"）。
 *
 * 持久化：onChange → usePhigrosSettings.setSetting → zustand persist → localStorage
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { useCallback, useMemo } from 'react';

/** 滑块档位定义 */
export interface SettingOption {
  /** 显示在标题右侧的值（如 "默认"、"0"、"16:9"） */
  label: string;
  /** 实际存储到 localStorage 的值（如 8000、0.6、1.777778） */
  value: number;
}

export interface SettingSliderProps {
  /** localStorage codename（用于 1:1 对齐原版 data-codename，仅作标记，不直接操作存储） */
  codename: string;
  /** 设置项标题（显示在标题左侧） */
  label: string;
  /** 全部档位（按物理顺序排列） */
  options: readonly SettingOption[] | SettingOption[];
  /** 当前值（来自 usePhigrosSettings） */
  currentValue: number;
  /** 值变更回调（由父组件委托给 setSetting） */
  onChange: (value: number) => void;
}

/**
 * 计算当前档位的 marginLeft 百分比
 *
 * 等价于原版累计公式：(offset/total)*200 的累加结果。
 * - midIndex = (N-1)/2（中间档位，对应 marginLeft=0）
 * - 单步位移 = 200/N %（与原版 total=N 时一致）
 * - 端点位移 = ±(N-1)/2 * 200/N = ±100*(N-1)/N %（N=5 时为 ±80%，N=201 时为 ±99.5%）
 */
function calcMarginLeft(currentIndex: number, total: number): number {
  if (total <= 0) return 0;
  const midIndex = (total - 1) / 2;
  return ((currentIndex - midIndex) / total) * 200;
}

export function SettingSlider({
  codename,
  label,
  options,
  currentValue,
  onChange,
}: SettingSliderProps) {
  const opts = useMemo(
    () => Array.from(options as readonly SettingOption[]),
    [options],
  );

  const currentIndex = useMemo(() => {
    const idx = opts.findIndex((o) => o.value === currentValue);
    return idx >= 0 ? idx : 0;
  }, [opts, currentValue]);

  const total = opts.length; // 与原版 data-total 语义一致（档位总数，非步数）
  const marginLeft = calcMarginLeft(currentIndex, total);
  const displayedValue = opts[currentIndex]?.label ?? '';

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const slider = e.currentTarget;
      const rect = slider.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const width = rect.width;

      let offset = 0;
      // 与原版一致：右侧 35px 视为 "+"，左侧 35px 视为 "-"
      if (offsetX > width - 35) offset = 1;
      else if (offsetX < 35) offset = -1;
      if (offset === 0) return;

      const newIndex = currentIndex + offset;
      // 边界检测：等价于原版 prevValue>=80&&offset==1 / prevValue<=-80&&offset==-1 的阻止
      if (newIndex < 0 || newIndex >= opts.length) return;

      onChange(opts[newIndex].value);
    },
    [currentIndex, opts, onChange],
  );

  return (
    <div className="item">
      <div
        className="title"
        data-name={label}
        data-value={displayedValue}
        data-codename={codename}
      />
      <div
        className="slider"
        role="slider"
        aria-label={label}
        aria-valuenow={currentIndex}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, opts.length - 1)}
        onClick={handleClick}
      >
        <div
          className="slideBlock"
          data-total={total}
          style={{ marginLeft: `${marginLeft}%` }}
        />
      </div>
    </div>
  );
}
