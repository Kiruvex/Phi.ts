'use client';

/**
 * Phi.ts — AudioContext 单例 + 用户手势 resume hook
 *
 * 源自 phigros-html5 (MPL-2.0) by lchzh3473 & HanHan233
 *
 * 解决浏览器自动播放限制：AudioContext 必须在用户手势后才能 resume。
 *
 * 注意：原版通过 oggmented-bundle.js 在 Safari 上提供 OggmentedAudioContext
 * 以支持 OGG 解码。oggmented 是运行时动态加载的全局变量，此处先返回标准
 * AudioContext，模拟器内部自行处理 oggmented 切换。
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { useCallback } from 'react';

/** 模块级 AudioContext 单例（懒初始化，仅客户端） */
let audioContextInstance: AudioContext | null = null;

/**
 * 获取 AudioContext 单例
 *
 * 懒初始化：首次调用时创建，后续返回同一实例。
 * 兼容 webkitAudioContext 前缀（旧版 Safari）。
 */
function getAudioContextInstance(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('AudioContext is not available on the server');
  }
  if (!audioContextInstance) {
    const AudioContextCtor: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error('AudioContext is not supported in this browser');
    }
    audioContextInstance = new AudioContextCtor();
  }
  return audioContextInstance;
}

/**
 * AudioContext 单例 + 用户手势 resume hook
 *
 * 使用示例：
 * ```tsx
 * const { getAudioContext, resume } = useAudioContext();
 *
 * // 在用户点击事件中调用 resume
 * const handlePlay = async () => {
 *   await resume();
 *   const ctx = getAudioContext();
 *   // 播放音频...
 * };
 * ```
 */
export function useAudioContext() {
  /** 获取 AudioContext 单例（懒初始化） */
  const getAudioContext = useCallback((): AudioContext => {
    return getAudioContextInstance();
  }, []);

  /**
   * 在用户手势后调用，解决浏览器自动播放限制
   *
   * 如果 AudioContext 处于 suspended 状态，调用 resume() 恢复。
   * 多次调用是安全的（已 running 时为 no-op）。
   */
  const resume = useCallback(async (): Promise<void> => {
    try {
      const ctx = getAudioContextInstance();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[useAudioContext] Failed to resume:', err);
      }
    }
  }, []);

  return { getAudioContext, resume };
}
