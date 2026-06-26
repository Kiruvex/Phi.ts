'use client';

/**
 * Phi.ts — index 首页
 *
 * 极简风格，与 tapToStart / chapterSelect 统一：
 *   - 黑底 + InitialBackground 毛玻璃背景
 *   - 居中 "Phi.ts" 标题
 *   - 进入链接
 *
 * 去掉了原版的：试听音频、文字提示、缓存提示、缓存按钮、A2HS 按钮、更新日志。
 * SW 注册已由 PhigrosProvider 全局处理，A2HS 由浏览器原生支持（用户可通过浏览器菜单添加到桌面）。
 */

import Link from 'next/link';
import { INITIAL_BACKGROUND } from '@/lib/phigros/asset-paths';

export default function HomePage() {
  return (
    <main className="phi-index-root">
      {/* 背景层：InitialBackground + 双层模糊（与 tapToStart 一致） */}
      <div className="phi-index-bg" aria-hidden="true" />

      {/* 居中标题 + 进入链接 */}
      <div className="phi-index-content">
        <h1 className="phi-index-title">Phi.ts</h1>
        <Link href="/tap-to-start" className="phi-index-enter">
          点击进入
        </Link>
      </div>
    </main>
  );
}
