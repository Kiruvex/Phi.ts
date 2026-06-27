'use client'

/**
 * Phi.ts — PhigrosProvider
 *
 * 客户端 Provider：在 <body> 内包裹 children，负责：
 *   1. 全局注册 Service Worker（修复原版只在 index.html 注册的 bug）
 *   2. 路由变化时隐藏过渡遮罩（新页面 mount 后遮罩渐出）
 *   3. 仅在客户端执行，SSR 时跳过
 */

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { hideRouteOverlay } from '@/lib/phigros/page-transition'

export function PhigrosProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    // 全局注册 Service Worker（仅首次）
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }
  }, [])

  // 路由变化时隐藏过渡遮罩（每次路由变化都触发）
  useEffect(() => {
    // 延迟一帧让新页面先渲染，再渐出遮罩
    requestAnimationFrame(() => {
      hideRouteOverlay()
    })
  }, [pathname])

  return <>{children}</>
}
