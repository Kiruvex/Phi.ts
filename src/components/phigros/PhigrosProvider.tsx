'use client'

/**
 * Phi.ts — PhigrosProvider
 *
 * 客户端 Provider：在 <body> 内包裹 children，负责：
 *   1. 全局注册 Service Worker（修复原版只在 index.html 注册的 bug）
 *   2. 仅在客户端执行，SSR 时跳过
 *
 * 后续可在此扩展 A2HS / 在线状态 / 全局音频上下文 等全局副作用。
 */

import { useEffect } from 'react'

export function PhigrosProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 全局注册 Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }
  }, [])

  return <>{children}</>
}
