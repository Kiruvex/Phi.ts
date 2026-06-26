'use client';

/**
 * Phi.ts — Phigros 设置 Zustand store
 *
 * 源自 phigros-html5 (MPL-2.0) by lchzh3473 & HanHan233
 * 参考: phigros-html5/settings/index.js
 *
 * 管理 13 个设置项，localStorage 持久化。
 *
 * 设计要点：
 * - store 的 state 字段名用简短名（如 inputOffset）
 * - localStorage 键名用原版 codename（如 input-offset），保证向后兼容
 * - toggle 项存储为 "true"/"false" 字符串（与原版一致）
 * - slider 项存储为数字字符串（与原版一致，但存真实值而非档位索引）
 * - 首次启动（localStorage 无数据）时用 SETTING_DEFAULTS 默认值
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS, SETTING_DEFAULTS } from '@/lib/phigros/constants';

/** 设置项字段名（排除方法） */
export type SettingsField =
  | 'inputOffset'
  | 'selectScaleRatio'
  | 'selectGlobalAlpha'
  | 'selectAspectRatio'
  | 'hitSong'
  | 'highLight'
  | 'autoFullscreen'
  | 'lineColor'
  | 'hyperMode'
  | 'imageBlur'
  | 'feedback'
  | 'showPoint'
  | 'showTransition';

/** Phigros 设置 store 接口 */
export interface PhigrosSettings {
  /** 谱面延时 MS（-500~500） */
  inputOffset: number;
  /** 按键缩放（真实值 6000~10000） */
  selectScaleRatio: number;
  /** 背景亮度（真实值 0.2~1） */
  selectGlobalAlpha: number;
  /** 画面宽高比（真实值 1.25~1.777778） */
  selectAspectRatio: number;
  /** 打击音效 */
  hitSong: boolean;
  /** 多押辅助 */
  highLight: boolean;
  /** 自动全屏 */
  autoFullscreen: boolean;
  /** FC/AP 指示器 */
  lineColor: boolean;
  /** HyperMode */
  hyperMode: boolean;
  /** 背景模糊 */
  imageBlur: boolean;
  /** 触摸反馈 */
  feedback: boolean;
  /** 定位点 */
  showPoint: boolean;
  /** 过渡动画 */
  showTransition: boolean;
  /** 设置某一项的值（同时写入 localStorage） */
  setSetting: (key: string, value: number | boolean) => void;
  /** 从 localStorage 重新加载所有设置 */
  loadFromStorage: () => void;
}

/** State field → localStorage codename 映射 */
const FIELD_TO_STORAGE_KEY: Record<SettingsField, string> = {
  inputOffset: STORAGE_KEYS.inputOffset,
  selectScaleRatio: STORAGE_KEYS.selectScaleRatio,
  selectGlobalAlpha: STORAGE_KEYS.selectGlobalAlpha,
  selectAspectRatio: STORAGE_KEYS.selectAspectRatio,
  hitSong: STORAGE_KEYS.hitSong,
  highLight: STORAGE_KEYS.highLight,
  autoFullscreen: STORAGE_KEYS.autoFullscreen,
  lineColor: STORAGE_KEYS.lineColor,
  hyperMode: STORAGE_KEYS.hyperMode,
  imageBlur: STORAGE_KEYS.imageBlur,
  feedback: STORAGE_KEYS.feedback,
  showPoint: STORAGE_KEYS.showPoint,
  showTransition: STORAGE_KEYS.showTransition,
};

/** Boolean 字段集合（存储为 "true"/"false" 字符串） */
const BOOLEAN_FIELDS: ReadonlySet<SettingsField> = new Set<SettingsField>([
  'hitSong',
  'highLight',
  'autoFullscreen',
  'lineColor',
  'hyperMode',
  'imageBlur',
  'feedback',
  'showPoint',
  'showTransition',
]);

/** 所有设置字段列表（用于遍历） */
const ALL_FIELDS = Object.keys(FIELD_TO_STORAGE_KEY) as SettingsField[];

/** 设置数据字段（不含方法） */
type SettingsState = Omit<PhigrosSettings, 'setSetting' | 'loadFromStorage'>;

/** 从 SETTING_DEFAULTS 构造默认 state */
function getDefaultState(): SettingsState {
  return {
    inputOffset: SETTING_DEFAULTS[STORAGE_KEYS.inputOffset],
    selectScaleRatio: SETTING_DEFAULTS[STORAGE_KEYS.selectScaleRatio],
    selectGlobalAlpha: SETTING_DEFAULTS[STORAGE_KEYS.selectGlobalAlpha],
    selectAspectRatio: SETTING_DEFAULTS[STORAGE_KEYS.selectAspectRatio],
    hitSong: SETTING_DEFAULTS[STORAGE_KEYS.hitSong],
    highLight: SETTING_DEFAULTS[STORAGE_KEYS.highLight],
    autoFullscreen: SETTING_DEFAULTS[STORAGE_KEYS.autoFullscreen],
    lineColor: SETTING_DEFAULTS[STORAGE_KEYS.lineColor],
    hyperMode: SETTING_DEFAULTS[STORAGE_KEYS.hyperMode],
    imageBlur: SETTING_DEFAULTS[STORAGE_KEYS.imageBlur],
    feedback: SETTING_DEFAULTS[STORAGE_KEYS.feedback],
    showPoint: SETTING_DEFAULTS[STORAGE_KEYS.showPoint],
    showTransition: SETTING_DEFAULTS[STORAGE_KEYS.showTransition],
  };
}

/** 将 localStorage 字符串解析为正确的类型 */
function parseStoredValue(field: SettingsField, raw: string): number | boolean {
  if (BOOLEAN_FIELDS.has(field)) {
    return raw === 'true';
  }
  const n = Number(raw);
  return Number.isNaN(n) ? SETTING_DEFAULTS[FIELD_TO_STORAGE_KEY[field] as keyof typeof SETTING_DEFAULTS] : n;
}

/**
 * 自定义 storage：每个字段存储在各自的 codename key 下（向后兼容原版）
 *
 * persist 中间件通过 createJSONStorage 调用：
 * - getItem: 返回 JSON.stringify(partialState) 或 null
 * - setItem: 接收 JSON.stringify(partialState)，解析后写入各 codename key
 */
const codenameStorage = {
  getItem: (): string | null => {
    if (typeof window === 'undefined') return null;
    const result: Partial<Record<SettingsField, number | boolean>> = {};
    let hasAny = false;
    for (const field of ALL_FIELDS) {
      const storageKey = FIELD_TO_STORAGE_KEY[field];
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== null) {
        result[field] = parseStoredValue(field, raw);
        hasAny = true;
      }
    }
    return hasAny ? JSON.stringify(result) : null;
  },
  setItem: (_name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      for (const field of ALL_FIELDS) {
        if (field in parsed) {
          const storageKey = FIELD_TO_STORAGE_KEY[field];
          window.localStorage.setItem(storageKey, String(parsed[field]));
        }
      }
    } catch {
      // 忽略 JSON 解析错误
    }
  },
  removeItem: (): void => {
    if (typeof window === 'undefined') return;
    for (const field of ALL_FIELDS) {
      window.localStorage.removeItem(FIELD_TO_STORAGE_KEY[field]);
    }
  },
};

/**
 * Phigros 设置 hook
 *
 * 使用示例：
 * ```tsx
 * const inputOffset = usePhigrosSettings((s) => s.inputOffset);
 * const setSetting = usePhigrosSettings((s) => s.setSetting);
 * setSetting('inputOffset', 100);
 * ```
 */
export const usePhigrosSettings = create<PhigrosSettings>()(
  persist(
    (set) => ({
      ...getDefaultState(),

      setSetting: (key: string, value: number | boolean) => {
        // 运行时校验 key 是否为已知设置字段
        if (!Object.prototype.hasOwnProperty.call(FIELD_TO_STORAGE_KEY, key)) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[usePhigrosSettings] Unknown setting key: ${key}`);
          }
          return;
        }
        set({ [key]: value } as Partial<PhigrosSettings>);
        // persist 中间件会自动触发 codenameStorage.setItem 写入 localStorage
      },

      loadFromStorage: () => {
        if (typeof window === 'undefined') return;
        const loaded: Partial<Record<SettingsField, number | boolean>> = {};
        for (const field of ALL_FIELDS) {
          const storageKey = FIELD_TO_STORAGE_KEY[field];
          const raw = window.localStorage.getItem(storageKey);
          if (raw !== null) {
            loaded[field] = parseStoredValue(field, raw);
          }
        }
        if (Object.keys(loaded).length > 0) {
          // 运行时保证类型正确（parseStoredValue 按字段返回 boolean 或 number）
          set(loaded as Partial<PhigrosSettings>);
        }
      },
    }),
    {
      name: 'phigros-settings', // persist key（实际存储由 codenameStorage 处理）
      storage: createJSONStorage(() => codenameStorage),
      // 仅持久化数据字段，排除方法
      partialize: (state) => {
        const { setSetting: _s, loadFromStorage: _l, ...rest } = state;
        return rest;
      },
    },
  ),
);
