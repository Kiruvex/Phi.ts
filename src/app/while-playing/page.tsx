'use client';

/**
 * Phi.ts — while-playing 页面（Client Component 薄壳）
 *
 * 读取 searchParams，渲染 PhigrosEmulator。
 * 用 Suspense 包裹 useSearchParams（Next.js 16 要求）。
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PhigrosEmulator from '@/components/phigros/PhigrosEmulator';

function WhilePlayingContent() {
  const searchParams = useSearchParams();
  const play = searchParams.get('play') || 'sample';
  const level = searchParams.get('l') || 'in';
  const chapter = searchParams.get('c') || 'single';

  return <PhigrosEmulator play={play} level={level} chapter={chapter} />;
}

export default function WhilePlayingPage() {
  return (
    <Suspense fallback={<div className="while-playing-root" />}>
      <WhilePlayingContent />
    </Suspense>
  );
}
