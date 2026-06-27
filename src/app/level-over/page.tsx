'use client';

/**
 * Phi.ts — LevelOver（结算）页面
 *
 * 源自 phigros-html5 (MPL-2.0) by lchzh3473 & HanHan233
 * 参考: phigros-html5/LevelOver/index.html + index.js + style.css
 *
 * 路由: /level-over?play=...&l=...&score=...&mc=...&p=...&g=...&b=...&m=...&e=...&c=...
 *
 * URL 参数:
 *   play (codename) — 谱面目录名
 *   l   (难度 ez/hd/in/at)
 *   score — 分数
 *   mc   — 最大连击
 *   p    — Perfect 总数
 *   g    — Good 总数
 *   b    — Bad 总数
 *   m    — Miss 总数
 *   e    — Good Early 数（用于推算 Late）
 *   c    — 章节 codename（用于返回 song-select）
 *
 * 计算:
 *   accuracy = round((perfect + good*0.65) / (perfect+good+bad+miss) * 10000) / 100
 *   late     = good - early
 *   grade    = 萌娘百科评级规则（F/C/B/A/S/V/Phi，V 可升级为 V_FC）
 *   ΔRKS     = accuracy>=70 ? ((accuracy-55)/45)^2 * levelRanking : 0  (toFixed(2))
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CHART_META,
  CHART_ILLUSTRATION,
  RANK_IMAGE,
  LEVEL_OVER_WAV,
  INITIAL_BACKGROUND,
} from '@/lib/phigros/asset-paths';
import { gameLevels, RANK_IMAGES } from '@/lib/phigros/constants';
import { navigateWithFade, playClickSound } from '@/lib/phigros/page-transition';

/** 谱面元数据（meta.json 反序列化结果） */
interface SongMeta {
  name: string;
  codename: string;
  artist: string;
  musicFile: string;
  ezRanking: number;
  hdRanking: number;
  inRanking: number;
  atRanking: number;
  illustration: string;
  chartDesigner: string;
  illustrator: string;
  /** 允许任意额外字段（如 sliceAudioStart 等），用索引签名 */
  [key: string]: unknown;
}

/**
 * 评级判定（萌娘百科规则，与原版 LevelOver/index.js 一致）
 * 返回 RANK_IMAGES 的键名（'phi' | 'vfc' | 'v' | 's' | 'a' | 'b' | 'c' | 'f' | ''）
 */
function computeGrade(
  score: number,
  good: number,
  bad: number,
  miss: number,
): string {
  if (score === 0) return '';
  if (score < 700000) return 'f';
  if (score <= 819999) return 'c';
  if (score <= 879999) return 'b';
  if (score <= 919999) return 'a';
  if (score <= 959999) return 's';
  if (score <= 999999) {
    if (good === 0 && bad === 0 && miss === 0) return 'vfc';
    return 'v';
  }
  return 'phi';
}

function LevelOverContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [meta, setMeta] = useState<SongMeta | null>(null);

  // ─── 解析 URL 参数 ───────────────────────────────
  const play = searchParams.get('play') ?? '';
  const levelStr = (searchParams.get('l') ?? 'in').toLowerCase();
  const chapter = searchParams.get('c') ?? 'single';
  const score = parseInt(searchParams.get('score') ?? '0', 10) || 0;
  const maxCombo = searchParams.get('mc') ?? '0';
  const perfectStr = searchParams.get('p') ?? '0';
  const good = parseInt(searchParams.get('g') ?? '0', 10) || 0;
  const bad = parseInt(searchParams.get('b') ?? '0', 10) || 0;
  const miss = parseInt(searchParams.get('m') ?? '0', 10) || 0;
  const early = parseInt(searchParams.get('e') ?? '0', 10) || 0;

  const playLevel = gameLevels[levelStr as keyof typeof gameLevels] ?? 0;
  const perfectNum = parseInt(perfectStr, 10) || 0;
  // accuracy = round((perfect + good*0.65) / (perfect+good+bad+miss) * 10000) / 100
  // 注意: 原版分母用 +0 防止 NaN（实际不会触发，因为至少有 perfect）
  const accuracy =
    Math.round(
      ((perfectNum + good * 0.65) / (perfectNum + good + bad + miss + 0)) * 10000,
    ) / 100;
  const late = good - early;
  const grade = computeGrade(score, good, bad, miss);

  // ─── fetch meta.json ───────────────────────────
  useEffect(() => {
    if (!play) return;
    let cancelled = false;
    fetch(CHART_META(play))
      .then((r) => r.json())
      .then((data: SongMeta) => {
        if (!cancelled) setMeta(data);
      })
      .catch((e) => console.error('Failed to fetch meta.json', e));
    return () => {
      cancelled = true;
    };
  }, [play]);

  // ─── 缩放：transform: scale(window.outerHeight/480)
  // 原版 index.js 第5行用 innerHeight/devicePixelRatio（初始），
  // 第128行 onresize 用 outerHeight/480 —— 以 onresize 为准。
  useEffect(() => {
    const applyScale = () => {
      if (!rootRef.current) return;
      const scale = window.outerHeight / 480;
      rootRef.current.style.transform = `scale(${scale})`;
    };
    applyScale();
    window.addEventListener('resize', applyScale);
    return () => window.removeEventListener('resize', applyScale);
  }, []);

  // ─── 背景音乐：<audio loop src="/phigros/assets/audio/LevelOver{levelIndex}.wav"> ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = LEVEL_OVER_WAV(playLevel);
    // 现代浏览器可能阻止自动播放，捕获错误避免未处理 Promise
    audio.play().catch((e) => console.error('Audio play failed', e));
  }, [playLevel]);

  // ─── 跳转 ───────────────────────────────────────
  const handleRetry = useCallback(() => {
    playClickSound();
    navigateWithFade(
      router,
      `/while-playing?play=${encodeURIComponent(play)}&l=${encodeURIComponent(
        levelStr,
      )}&c=${encodeURIComponent(chapter)}`,
    );
  }, [router, play, levelStr, chapter]);
  const handleBack = useCallback(() => {
    playClickSound();
    navigateWithFade(router, `/song-select?c=${encodeURIComponent(chapter)}`);
  }, [router, chapter]);
  const handleKey = useCallback(
    (handler: () => void) => (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    },
    [],
  );

  // ─── 派生数据 ───────────────────────────────────
  // 背景图：meta 加载前用 InitialBackground，加载后用曲绘
  const bgUrl =
    meta?.illustration && play
      ? CHART_ILLUSTRATION(play, meta.illustration)
      : INITIAL_BACKGROUND;
  const songImgUrl =
    meta?.illustration && play
      ? CHART_ILLUSTRATION(play, meta.illustration).replace(/#/g, '%23')
      : INITIAL_BACKGROUND;
  const levelRanking = meta
    ? Math.floor(Number(meta[`${levelStr}Ranking`]) || 0)
    : 0;
  // ΔRKS = accuracy>=70 ? ((accuracy-55)/45)^2 * levelRanking : 0
  const deltaRKS =
    accuracy >= 70
      ? Math.pow((accuracy - 55) / 45, 2) * levelRanking
      : 0;
  const scoreStr = score.toString().padStart(7, '0');
  const levelStringDisplay = meta ? `${levelStr.toUpperCase()} Lv.${levelRanking}` : '';

  return (
    <>
      {/* 背景层：曲绘，cover 全屏 */}
      <div
        className="lo-bg"
        style={{ backgroundImage: `url(${bgUrl})` }}
        aria-hidden
      />
      {/* 左上角重试按钮 */}
      <div
        className="lo-retry-btn"
        onClick={handleRetry}
        onKeyDown={handleKey(handleRetry)}
        role="button"
        aria-label="Retry"
        tabIndex={0}
      />
      {/* 主内容容器：flex 居中 + 缩放 */}
      <div className="lo-flex-container">
        <div className="lo-main-content" ref={rootRef}>
          {/* 左侧：曲绘 + 曲名 + 难度 */}
          <div className="lo-left-part">
            <img
              className="lo-song-img"
              src={songImgUrl}
              alt={meta?.name ?? ''}
            />
            <div className="lo-song-name">{meta?.name ?? ''}</div>
            <div className="lo-level-string">{levelStringDisplay}</div>
          </div>
          {/* 右侧：分数 + 评级 + 概览 + 详情 */}
          <div className="lo-score-outer-container">
            <div className="lo-score-frame">
              <div className="lo-score">{scoreStr}</div>
              {grade && (
                <img
                  className="lo-grade"
                  src={RANK_IMAGE(RANK_IMAGES[grade] ?? '')}
                  alt={grade}
                />
              )}
            </div>
            <div className="lo-at-a-glance">
              <div className="lo-max-combo">{maxCombo}</div>
              <div className="lo-accu">{accuracy}%</div>
            </div>
            <div className="lo-detail-frame">
              <div className="lo-perfect">{perfectStr}</div>
              <div className="lo-good">{good}</div>
              <div className="lo-bad">{bad}</div>
              <div className="lo-miss">{miss}</div>
              <div className="lo-more-detail">
                <div className="lo-early">{early}</div>
                <div className="lo-late">{late}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 底部中央：RKS 展开面板 */}
      <div className="lo-extra-info">
        <div className="lo-text">
          本曲最终RKS:<span>{deltaRKS.toFixed(2)}</span>
        </div>
      </div>
      {/* 右下角返回按钮 */}
      <div
        className="lo-back-btn"
        onClick={handleBack}
        onKeyDown={handleKey(handleBack)}
        role="button"
        aria-label="Back to song select"
        tabIndex={0}
      />
      {/* 背景音乐 */}
      <audio ref={audioRef} loop />
    </>
  );
}

export default function LevelOverPage() {
  // useSearchParams 必须包裹在 Suspense 边界中（Next.js 16 要求）
  return (
    <Suspense fallback={<div className="lo-bg" />}>
      <LevelOverContent />
    </Suspense>
  );
}
