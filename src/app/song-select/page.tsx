'use client';

/**
 * Phi.ts — songSelect（歌曲选择）页面
 *
 * 源自 phigros-html5 (MPL-2.0) by lchzh3473 & HanHan233
 * 参考: phigros-html5/songSelect/index.html (49 行) + index.js (184 行) +
 *       SongList.js (136 行) + style.css (456 行)
 *
 * 路由: /song-select?c={chapter}
 *
 * 1:1 对齐原版功能：
 *   1. audio#slicedAudioElement（切片预览音频，src 动态切换 + 15s 循环）
 *   2. div.darkOverlay（fadeIn 动画 opacity:1→0，入场遮罩）
 *   3. div.backBtn（左上角，onclick → /chapter-select）
 *   4. div.readyToLoadOverlay（点击播放后 slideIn 2s 从右滑入）
 *   5. div.leftArea（左倾斜面板，skew(-15deg), margin-left:100px, width:350px）
 *      - topLeftBar（sortMode "默认" + settingBtn "设置"）
 *      - songList#songList（歌单容器，position:absolute + top:滚动）
 *   6. div.rightArea（右倾斜面板，skew(-15deg) scale 缩放）
 *      - illustrationContainer > img.illustration
 *      - detailBar > levelChooser + score
 *   7. div.playBtn（右下角，onclick → readyToLoadTrigger）
 *
 * 数据流（原版 index.js）：
 *   - 从 URL 参数获取 c（chapter codename）
 *   - fetch /phigros/charts/{c}.json → ["sample","samplePec","ouroVoros"]
 *   - 对每首歌 fetch /phigros/charts/{codename}/meta.json
 *   - 默认 levelSelected="ez"，switchLevel("ez")，switchSong(0)
 *
 * SongList 切歌副作用（原版 SongList.switchSong）：
 *   - 播放 Tap5.wav
 *   - fetch illustration → blob → URL.createObjectURL（设背景 + img）
 *   - 设 audio#slicedAudioElement.src = musicFile
 *   - currentTime = sliceAudioStart + play + setInterval(15s) 循环
 *
 * LevelChooser 切换（原版 changeLevel）：
 *   - 旧 selected 加 fadeOut，300ms 后移除 selected，新选中加 fadeIn + selected
 *   - 立即调用 songList.switchLevel 更新所有 songItem 难度显示
 *
 * readyToLoadTrigger（原版 index.js）：
 *   - 加 .go 类触发 slideIn 2s cubic-bezier(0.52,0.28,0.04,0.98) 动画
 *   - 播放 Tap7.wav
 *   - 2s 后 router.push('/while-playing?play={codename}&l={level}&c={chapter}')
 *
 * rightArea 缩放（原版 index.js）：
 *   transform: skew(-15deg) scale(innerHeight/400/Math.round(devicePixelRatio/2))
 *   right: 0.2 * (clientHeight/clientWidth) * clientWidth = 0.2 * clientHeight
 *
 * Bug 修复点：
 *   1. 原版 wheelDeltaY（已废弃）→ deltaY（符号取反保持方向一致）
 *   2. 原版同步 XHR `xhr.open(..., false)` 阻塞主线程 → fetch + Promise.all 异步
 *   3. 原版 touchmove 漏掉 prevTouch 更新（导致位移累积）→ 每次更新
 *   4. 原版 songList 初始 position:relative，首次滚动时跳到 position:absolute;top:0
 *      造成 100px 视觉跳变 → 本实现始终 position:absolute，top:100+topOffset
 *   5. 原版 illustration blob URL 未清理 → 本实现切换歌曲时 revokeObjectURL 旧 URL
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  SongList,
  type SongMeta,
  type SongListItem,
} from '@/components/phigros/SongList';
import { LevelChooser } from '@/components/phigros/LevelChooser';
import { ScoreDisplay } from '@/components/phigros/ScoreDisplay';
import {
  CHAPTER_LIST,
  CHART_META,
  CHART_ILLUSTRATION,
  CHART_MUSIC,
  INITIAL_BACKGROUND,
  TAP_AUDIO,
} from '@/lib/phigros/asset-paths';
import { type Difficulty } from '@/lib/phigros/constants';
import { navigateWithFade, playClickSound } from '@/lib/phigros/page-transition';

// ─── 客户端检测（避免 SSR/CSR hydration mismatch） ────────────
const subscribeNoop = () => () => {};
const getMountedClient = () => true;
const getMountedServer = () => false;

// ─── 工具函数 ──────────────────────────────────────────────────

/** 播放一次性音效（创建临时 audio 元素，播完即弃） */
function playOneShot(src: string) {
  if (typeof window === 'undefined') return;
  const audio = new Audio(src);
  audio.play().catch((e) => console.error('[songSelect] One-shot audio failed:', e));
}

/**
 * 计算 rightArea 缩放与 right 偏移（原版 index.js 49-58 行）
 *   scale = innerHeight / 400 / Math.round(devicePixelRatio / 2)
 *   right = 0.2 * (clientHeight / clientWidth) * clientWidth = 0.2 * clientHeight
 */
function computeRightAreaStyle(): { transform: string; right: string } {
  if (typeof window === 'undefined') {
    return { transform: 'skew(-15deg) scale(1)', right: '0px' };
  }
  const dprRound = Math.round(window.devicePixelRatio / 2) || 1;
  const scale = window.innerHeight / 400 / dprRound;
  const right = 0.2 * window.innerHeight;
  return {
    transform: `skew(-15deg) scale(${scale})`,
    right: `${right}px`,
  };
}

// ─── 主内容组件 ────────────────────────────────────────────────

function SongSelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClient = useSyncExternalStore(
    subscribeNoop,
    getMountedClient,
    getMountedServer,
  );

  // ─── URL 参数 ───────────────────────────────────────────────
  const chapter = searchParams.get('c') ?? 'single';

  // ─── 数据状态 ───────────────────────────────────────────────
  const [songMetaList, setSongMetaList] = useState<SongListItem[]>([]);
  const [selectedSongIndex, setSelectedSongIndex] = useState<number | null>(null);

  // displayLevel: 立即更新，驱动 SongList 中所有 SongItem 的难度显示
  // chooserLevel: 延迟 300ms 更新，驱动 LevelChooser 的 .selected 类
  // pendingLevel: 300ms 动画期间，驱动 LevelChooser 的 .fadeIn 类
  const [displayLevel, setDisplayLevel] = useState<Difficulty>('ez');
  const [chooserLevel, setChooserLevel] = useState<Difficulty>('ez');
  const [pendingLevel, setPendingLevel] = useState<Difficulty | null>(null);

  // 切片音频 + 曲绘 blob URL
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null);

  // 滚动偏移
  const [topOffset, setTopOffset] = useState(0);

  // readyToLoad 遮罩
  const [readyToLoad, setReadyToLoad] = useState(false);

  // rightArea 缩放（inline style 应用）
  const [rightAreaStyle, setRightAreaStyle] = useState<{
    transform: string;
    right: string;
  }>({ transform: 'skew(-15deg) scale(1)', right: '0px' });

  // ─── Refs ────────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement>(null);
  const sliceIntervalRef = useRef<number | null>(null);
  const bgUrlRef = useRef<string | null>(null);
  const yCoordRef = useRef(0);
  const prevTouchYRef = useRef(0);
  const rightAreaRef = useRef<HTMLDivElement>(null);
  const levelChangeTimerRef = useRef<number | null>(null);
  const readyToLoadTimerRef = useRef<number | null>(null);

  // ─── 数据加载：fetch chapter JSON + 所有 meta.json ─────────
  useEffect(() => {
    if (!isClient || !chapter) return;
    let cancelled = false;

    fetch(CHAPTER_LIST(chapter))
      .then((r) => {
        if (!r.ok) throw new Error(`chapter list responded ${r.status}`);
        return r.json() as Promise<string[]>;
      })
      .then(async (codenames) => {
        if (cancelled) return;
        // 并发 fetch 所有 meta.json（原版用同步 XHR 串行，迁移为并发）
        const metas = await Promise.all(
          codenames.map((codename) =>
            fetch(CHART_META(codename))
              .then((mr) => mr.json() as Promise<SongMeta>)
              .then((meta) => ({ meta, codename })),
          ),
        );
        if (cancelled) return;
        setSongMetaList(metas);
        // 原版：强行切换成第一首歌
        setSelectedSongIndex(0);
      })
      .catch((e) =>
        console.error('[songSelect] Failed to load chapter or metas:', e),
      );

    return () => {
      cancelled = true;
    };
  }, [chapter, isClient]);

  // ─── 切歌副作用（原版 SongList.switchSong） ───────────────
  useEffect(() => {
    if (!isClient) return;
    if (selectedSongIndex === null || songMetaList.length === 0) return;
    const item = songMetaList[selectedSongIndex];
    if (!item) return;

    let cancelled = false;

    // 1. 播放 Tap5.wav 切歌音效
    playOneShot(TAP_AUDIO(5));

    // 2. fetch illustration → blob → URL.createObjectURL
    const illustrationPath = CHART_ILLUSTRATION(
      item.codename,
      item.meta.illustration,
    );
    fetch(illustrationPath)
      .then((r) => {
        if (!r.ok) throw new Error(`illustration responded ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const newUrl = URL.createObjectURL(blob);
        // 清理旧的 blob URL（原版未清理，存在内存泄漏）
        if (bgUrlRef.current) {
          URL.revokeObjectURL(bgUrlRef.current);
        }
        bgUrlRef.current = newUrl;
        setIllustrationUrl(newUrl);
      })
      .catch((e) =>
        console.error('[songSelect] Failed to load illustration:', e),
      );

    // 3. 设置切片音频 src + currentTime + play + 15s 循环
    const audio = audioRef.current;
    if (audio) {
      audio.src = CHART_MUSIC(item.codename, item.meta.musicFile);
      const sliceStart = Number(item.meta.sliceAudioStart) || 0;
      // 设置 currentTime（原版直接赋值，浏览器会在 metadata 加载后 seek）
      audio.currentTime = sliceStart;
      audio.play().catch((e) =>
        console.error('[songSelect] Sliced audio play failed:', e),
      );

      // 清理旧的 interval
      if (sliceIntervalRef.current) {
        clearInterval(sliceIntervalRef.current);
      }
      // 15s 循环切片
      sliceIntervalRef.current = window.setInterval(() => {
        audio.currentTime = sliceStart;
        audio.play().catch(() => {
          /* 自动播放策略可能阻止，忽略 */
        });
      }, 15000);
    }

    return () => {
      cancelled = true;
    };
  }, [selectedSongIndex, songMetaList, isClient]);

  // ─── 卸载清理：interval + blob URL + 定时器 ───────────────
  useEffect(() => {
    return () => {
      if (sliceIntervalRef.current) {
        clearInterval(sliceIntervalRef.current);
        sliceIntervalRef.current = null;
      }
      if (bgUrlRef.current) {
        URL.revokeObjectURL(bgUrlRef.current);
        bgUrlRef.current = null;
      }
      if (levelChangeTimerRef.current) {
        clearTimeout(levelChangeTimerRef.current);
        levelChangeTimerRef.current = null;
      }
      if (readyToLoadTimerRef.current) {
        clearTimeout(readyToLoadTimerRef.current);
        readyToLoadTimerRef.current = null;
      }
    };
  }, []);

  // ─── wheel / touch 滚动（修改 songList 的 top） ──────────
  useEffect(() => {
    if (!isClient) return;

    // 原版: newYCoord = yCoord + e.wheelDeltaY / 8
    // wheelDeltaY 已废弃，改用 deltaY（符号取反：deltaY 正值=向下滚动）
    // 计算可滚动范围：歌单内容高度 - 容器可见高度
    const getMaxScroll = () => {
      const songList = document.getElementById('songList');
      if (!songList) return 0;
      const container = songList.parentElement;
      if (!container) return 0;
      return Math.max(0, songList.offsetHeight - container.offsetHeight);
    };

    const clampY = (v: number) => {
      const maxScroll = getMaxScroll();
      if (v > 0) return 0;
      if (v < -maxScroll) return -maxScroll;
      return v;
    };

    const onWheel = (e: WheelEvent) => {
      const maxScroll = getMaxScroll();
      if (maxScroll <= 0) return;
      const newY = clampY(yCoordRef.current - e.deltaY / 8);
      yCoordRef.current = newY;
      setTopOffset(newY);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.changedTouches.length === 0) return;
      prevTouchYRef.current = e.changedTouches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.changedTouches.length === 0) return;
      const maxScroll = getMaxScroll();
      if (maxScroll <= 0) return;
      const touchY = e.changedTouches[0].clientY;
      const newY = clampY(yCoordRef.current + -0.1 * (prevTouchYRef.current - touchY));
      yCoordRef.current = newY;
      setTopOffset(newY);
      prevTouchYRef.current = touchY;
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [isClient]);

  // ─── rightArea 缩放（原版 onresize） ─────────────────────
  useEffect(() => {
    if (!isClient) return;
    const applyScale = () => {
      setRightAreaStyle(computeRightAreaStyle());
    };
    applyScale();
    window.addEventListener('resize', applyScale);
    return () => window.removeEventListener('resize', applyScale);
  }, [isClient]);

  // ─── 事件处理 ───────────────────────────────────────────────

  const handleBack = useCallback(() => {
    playClickSound();
    navigateWithFade(router, '/chapter-select');
  }, [router]);

  const handleSettings = useCallback(() => {
    playClickSound();
    navigateWithFade(router, '/settings');
  }, [router]);

  const handleSelectSong = useCallback((index: number) => {
    setSelectedSongIndex(index);
  }, []);

  // LevelChooser 切换：立即更新 displayLevel（驱动 songList），
  // 300ms 后更新 chooserLevel + 清除 pendingLevel（驱动 LevelChooser 视觉）
  const handleLevelClick = useCallback(
    (newLevel: Difficulty) => {
      if (newLevel === chooserLevel) return;
      // 立即更新 songList 显示（原版 switchLevel 同步调用）
      setDisplayLevel(newLevel);
      // 标记 pending，触发 fadeIn 动画
      setPendingLevel(newLevel);
      // 清除上一个未完成的定时器
      if (levelChangeTimerRef.current) {
        clearTimeout(levelChangeTimerRef.current);
      }
      // 300ms 后切换 selected 类
      levelChangeTimerRef.current = window.setTimeout(() => {
        setChooserLevel(newLevel);
        setPendingLevel(null);
        levelChangeTimerRef.current = null;
      }, 300);
    },
    [chooserLevel],
  );

  // readyToLoadTrigger：加 .go 类 + Tap7 + 2s 后跳转
  const handlePlay = useCallback(() => {
    if (selectedSongIndex === null) return;
    const item = songMetaList[selectedSongIndex];
    if (!item) return;
    // 触发 slideIn 动画
    setReadyToLoad(true);
    // 播放 Tap7.wav
    playOneShot(TAP_AUDIO(7));
    // 2s 后跳转 while-playing（原版 location.href）
    if (readyToLoadTimerRef.current) {
      clearTimeout(readyToLoadTimerRef.current);
    }
    readyToLoadTimerRef.current = window.setTimeout(() => {
      // 创建全局遮罩保持过渡连续（readyToLoadOverlay 随页面卸载会消失）
      const overlay = document.getElementById('phi-route-overlay');
      if (!overlay) {
        const o = document.createElement('div');
        o.id = 'phi-route-overlay';
        o.style.cssText = 'position:fixed;inset:0;background:#000;opacity:1;pointer-events:none;z-index:99999;';
        document.body.appendChild(o);
      }
      router.push(
        `/while-playing?play=${encodeURIComponent(item.codename)}&l=${encodeURIComponent(
          displayLevel,
        )}&c=${encodeURIComponent(chapter)}`,
      );
      readyToLoadTimerRef.current = null;
    }, 2000);
  }, [selectedSongIndex, songMetaList, displayLevel, chapter, router]);

  // 键盘事件辅助（仅用于不访问 ref 的 handler）
  const handleKey = useCallback(
    (handler: () => void) => (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    },
    [],
  );

  // handlePlay 单独定义 keydown（避免 react-hooks/refs 误报：
  // handlePlay 内部访问 readyToLoadTimerRef.current，若通过 handleKey 间接调用，
  // 静态分析会担心 ref 在 render 期间被读取）
  const handlePlayKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handlePlay();
      }
    },
    [handlePlay],
  );

  // ─── 派生数据 ───────────────────────────────────────────────
  const selectedSongMeta: SongMeta | null =
    selectedSongIndex !== null && songMetaList[selectedSongIndex]
      ? songMetaList[selectedSongIndex].meta
      : null;

  // 背景层 inline style：未加载时用 InitialBackground
  const bgStyle: React.CSSProperties = illustrationUrl
    ? {
        backgroundImage: `url(${illustrationUrl})`,
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
      }
    : {
        backgroundImage: `url(${INITIAL_BACKGROUND})`,
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
      };

  // ─── 渲染 ───────────────────────────────────────────────────
  // SSR 阶段：渲染空背景层避免 hydration mismatch
  if (!isClient) {
    return <div className="song-select-bg" aria-busy="true" />;
  }

  return (
    <>
      {/* 背景层：替代原版 html background */}
      <div className="song-select-bg" style={bgStyle} aria-hidden />

      {/* 内容层：替代原版 body，backdrop-filter 模糊背景 */}
      <div className="song-select-root">
        {/* 切片预览音频 */}
        <audio ref={audioRef} id="slicedAudioElement" />

        {/* 入场遮罩：fadeIn 动画 opacity:1→0 */}
        <div className="darkOverlay" aria-hidden />

        {/* 左上角返回按钮 */}
        <div
          className="backBtn"
          onClick={handleBack}
          onKeyDown={handleKey(handleBack)}
          role="button"
          aria-label="返回章节选择"
          tabIndex={0}
        />

        {/* 播放点击后的滑入遮罩 */}
        <div
          className={`readyToLoadOverlay${readyToLoad ? ' go' : ''}`}
          aria-hidden
        />

        {/* 左侧倾斜面板 */}
        <div className="leftArea">
          <div className="topLeftBar">
            <div className="sortMode">默认</div>
            <div
              className="settingBtn"
              onClick={handleSettings}
              onKeyDown={handleKey(handleSettings)}
              role="button"
              aria-label="打开设置"
              tabIndex={0}
            >
              设置
            </div>
          </div>

          {/* 歌单容器 */}
          <SongList
            items={songMetaList}
            selectedIndex={selectedSongIndex}
            level={displayLevel}
            topOffset={topOffset}
            onSelect={handleSelectSong}
          />
        </div>

        {/* 右侧倾斜面板 */}
        <div
          className="rightArea"
          ref={rightAreaRef}
          style={{
            transform: rightAreaStyle.transform,
            right: rightAreaStyle.right,
          }}
        >
          <div className="illustrationContainer">
            <img
              className="illustration"
              src={illustrationUrl ?? INITIAL_BACKGROUND}
              alt={selectedSongMeta?.name ?? '请选择歌曲'}
            />
          </div>
          <div className="detailBar">
            <LevelChooser
              selectedLevel={chooserLevel}
              pendingLevel={pendingLevel}
              songMeta={selectedSongMeta}
              onSelectLevel={handleLevelClick}
            />
            <ScoreDisplay />
          </div>
        </div>

        {/* 右下角播放按钮 */}
        <div
          className="playBtn"
          onClick={handlePlay}
          onKeyDown={handlePlayKey}
          role="button"
          aria-label="开始游玩"
          tabIndex={0}
        />
      </div>
    </>
  );
}

// ─── 默认导出（包裹 Suspense 边界，Next.js 16 要求 useSearchParams 必须在 Suspense 内） ──

export default function SongSelectPage() {
  return (
    <Suspense fallback={<div className="song-select-bg" aria-busy="true" />}>
      <SongSelectContent />
    </Suspense>
  );
}
