'use client';

/**
 * Phi.ts — A2HS (Add to Home Screen) 安装提示 hook
 *
 * 源自 phigros-html5 (MPL-2.0) by lchzh3473 & HanHan233
 * 参考: phigros-html5/index.js 第 55-78 行
 *
 * 监听 beforeinstallprompt 事件，缓存事件对象，
 * 在用户主动点击安装按钮时调用 prompt() 触发安装弹窗。
 *
 * 注意：
 * - beforeinstallprompt 仅在 Chrome/Edge 等 Chromium 浏览器触发（需 HTTPS + manifest）
 * - Safari iOS 使用独立的 "添加到主屏幕" 功能，不支持此 API
 * - 安装完成后 appinstalled 事件触发，canInstall 自动变为 false
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useState } from 'react';

/** beforeinstallprompt 事件接口（W3C 未标准化，但 Chromium 实现） */
interface BeforeInstallPromptEvent extends Event {
  /** 触发安装弹窗 */
  prompt: () => Promise<void>;
  /** 用户选择结果（accepted / dismissed） */
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

/**
 * PWA 安装提示 hook
 *
 * 使用示例：
 * ```tsx
 * const { canInstall, promptInstall } = usePwaInstall();
 *
 * return canInstall ? (
 *   <button onClick={() => promptInstall()}>添加到主屏幕</button>
 * ) : null;
 * ```
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      // 阻止 Chrome 67 及更早版本自动显示提示
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /** 是否可以触发安装弹窗 */
  const canInstall = deferredPrompt !== null;

  /**
   * 触发安装弹窗
   *
   * 仅在 canInstall 为 true 时有效。
   * 调用后等待用户做出选择，然后清除缓存的 prompt 事件。
   */
  const promptInstall = useCallback(async (): Promise<void> => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[usePwaInstall] prompt failed:', err);
      }
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  return { canInstall, promptInstall };
}
