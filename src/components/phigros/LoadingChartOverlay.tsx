'use client'

/**
 * Phi.ts — LoadingChartOverlay
 *
 * 源自 phigros-html5 (MPL-2.0) by lchzh3473 & HanHan233
 * 参考: phigros-html5/loadingChartScreen/index.html + style.css
 *       phigros-html5/loadingScreen/index.js (随机 tip)
 *
 * 替代原版 whilePlaying 中用 iframe 嵌入 loadingChartScreen 的设计，
 * 改为同组件内的全屏 loading 遮罩，由父组件通过 `visible` prop 控制显隐。
 *
 * 行为对齐:
 *   1. fetch `/phigros/charts/{chart}/meta.json` → 填充曲名/曲师/谱师/曲绘/难度数字
 *   2. fetch `/phigros/assets/tips.json` → 随机选一条填入 tip
 *   3. body 背景设为曲绘 + backdrop-filter:blur(100px)（这里改为根 div 背景，避免污染 body）
 *   4. 难度数字 = Math.floor(meta[level + 'Ranking'])，难度标识 EZ/HD/IN/AT 根据 level class 显示
 *   5. loadingBar 白块平移 + 文字闪烁
 *   6. chartDesigner/illustrator slideAndFadeIn 渐入
 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { useEffect, useState } from 'react'
import {
  CHART_META,
  CHART_ILLUSTRATION,
  TIPS_JSON,
  INITIAL_BACKGROUND,
} from '@/lib/phigros/asset-paths'

/** 谱面 meta.json 结构（仅声明本组件用到的字段） */
interface SongMeta {
  name: string
  artist: string
  chartDesigner: string
  illustrator: string
  illustration: string
  ezRanking?: number
  hdRanking?: number
  inRanking?: number
  atRanking?: number
}

export interface LoadingChartOverlayProps {
  /** 谱面 codename（如 "sample"） */
  chart: string
  /** 难度（ez/hd/in/at，大小写不敏感） */
  level: string
  /** 是否显示（false 时 return null，且不发起 fetch） */
  visible: boolean
}

export function LoadingChartOverlay({ chart, level, visible }: LoadingChartOverlayProps) {
  // custom 谱面：同步从 sessionStorage 读取 meta（避免 effect 里 setState）
  const [songMeta, setSongMeta] = useState<SongMeta | null>(() => {
    if (!visible || chart !== 'custom') return null;
    const metaStr = sessionStorage.getItem('phi-custom-meta');
    if (metaStr) {
      try {
        return JSON.parse(metaStr) as SongMeta;
      } catch {
        return null;
      }
    }
    return null;
  })
  const [tip, setTip] = useState<string>('')

  useEffect(() => {
    if (!visible) return

    let cancelled = false

    // 内置谱面：拉取 meta.json（custom 谱面在 useState 初始化时已读 sessionStorage）
    if (chart !== 'custom') {
      fetch(CHART_META(chart))
        .then((res) => {
          if (!res.ok) throw new Error(`meta.json responded ${res.status}`)
          return res.json() as Promise<SongMeta>
        })
        .then((meta) => {
          if (!cancelled) setSongMeta(meta)
        })
        .catch((err) => console.error('[LoadingChartOverlay] Failed to load meta:', err))
    }

    // 拉取 tips.json 并随机选一条（原版 loadingScreen/index.js）
    fetch(TIPS_JSON)
      .then((res) => {
        if (!res.ok) throw new Error(`tips.json responded ${res.status}`)
        return res.json() as Promise<string[]>
      })
      .then((tips) => {
        if (cancelled || !Array.isArray(tips) || tips.length === 0) return
        // 原版用 Math.random()*(len+1) 会越界取到 undefined，这里修正为标准写法
        const idx = Math.floor(Math.random() * tips.length)
        setTip(tips[idx])
      })
      .catch((err) => console.error('[LoadingChartOverlay] Failed to load tips:', err))

    return () => {
      cancelled = true
    }
  }, [chart, visible])

  if (!visible) return null

  const levelLower = level.toLowerCase()

  // 难度数字：Math.floor(meta[level + 'Ranking'])
  const rankingMap: Record<string, number | undefined> = {
    ez: songMeta?.ezRanking,
    hd: songMeta?.hdRanking,
    in: songMeta?.inRanking,
    at: songMeta?.atRanking,
  }
  const ranking = rankingMap[levelLower]
  const levelNumber = typeof ranking === 'number' ? Math.floor(ranking) : 0

  // 曲绘 URL（meta 未加载时用 InitialBackground 占位，保持遮罩背景始终存在）
  const illustrationUrl = songMeta
    ? CHART_ILLUSTRATION(chart, songMeta.illustration)
    : null

  const rootStyle: React.CSSProperties = {
    backgroundImage: illustrationUrl
      ? `url(${illustrationUrl})`
      : `url(${INITIAL_BACKGROUND})`,
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    backgroundSize: 'cover',
  }

  return (
    <div className="phi-lcs-root" style={rootStyle} role="status" aria-live="polite">
      <div className="phi-lcs-mainContent">
        <div className="phi-lcs-textInfo">
          <div className="phi-lcs-songInfoFrame">
            <div className="phi-lcs-basicInfo">
              <div className="phi-lcs-songName">{songMeta?.name ?? ''}</div>
              <div className="phi-lcs-artist">{songMeta?.artist ?? ''}</div>
            </div>
            <div
              className={`phi-lcs-level phi-lcs-level-${levelLower}`}
              data-level={levelNumber}
            />
          </div>
          <div className="phi-lcs-chartDesigner">{songMeta?.chartDesigner ?? ''}</div>
          <div className="phi-lcs-illustrator">{songMeta?.illustrator ?? ''}</div>
        </div>
        <div className="phi-lcs-songImage">
          {illustrationUrl && (
            <img
              className="phi-lcs-illustration"
              src={illustrationUrl}
              alt={songMeta?.name ?? ''}
            />
          )}
        </div>
      </div>
      <div className="phi-lcs-tip">{tip}</div>
      <div className="phi-lcs-loadingBar">
        <div className="phi-lcs-loadingBarTxT">Loading...</div>
        <div className="phi-lcs-loadingBarBG" />
      </div>
    </div>
  )
}
