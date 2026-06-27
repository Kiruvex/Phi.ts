'use client';

/**
 * Phi.ts — index 首页
 *
 * 极简风格，与 tapToStart / chapterSelect 统一：
 *   - 黑底 + InitialBackground 毛玻璃背景
 *   - 居中 "Phi.ts" 标题（多层发光效果）
 *   - 进入链接
 *   - 气泡粒子动画（参考 phigros-on-html）
 */

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { playClickSound } from '@/lib/phigros/page-transition';

export default function HomePage() {
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    // 生成 8 个随机粒子
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('div');
      p.className = 'phi-particle';
      const size = 8 + Math.random() * 20;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDelay = `${Math.random() * 12}s`;
      p.style.animationDuration = `${10 + Math.random() * 6}s`;
      container.appendChild(p);
    }
    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <main className="phi-index-root">
      <div className="phi-index-bg" aria-hidden="true" />
      <div className="phi-particles" ref={particlesRef} aria-hidden="true" />
      <div className="phi-index-content">
        <h1 className="phi-index-title">Phi.ts</h1>
        <Link href="/tap-to-start" className="phi-index-enter" onClick={() => playClickSound()}>
          点击进入
        </Link>
      </div>
    </main>
  );
}
