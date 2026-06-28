'use client';

/**
 * Phi.ts — ZipUploadCard 自定义 ZIP 上传卡片
 *
 * 样式与 ChapterCard 一致（skew 倾斜），但背景为模糊光影毛玻璃。
 * 点击后弹出文件选择器，选择 ZIP 文件后：
 * 1. 用 JSZip 解压
 * 2. 自动识别文件类型（.json/.pec=谱面, .mp3/.ogg=音频, .png/.jpg=图片）
 * 3. 解析 meta 信息（从谱面文件名或 JSON 内容推断）
 * 4. 跳转到 while-playing 页面，通过 sessionStorage 传递资源
 */

import { useCallback, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import JSZip from 'jszip';
import { playClickSound } from '@/lib/phigros/page-transition';
import { chart123, chartp23 } from '@/lib/phigros/chart-parser';
import { setBlob } from '@/lib/phigros/custom-chart-storage';

export interface ZipUploadCardProps {
  /** 是否展开（accordion 模式）。未展开时点击仅展开，不打开文件选择器 */
  expanded?: boolean;
  /** ZIP 解析完成回调（已展开状态下选择文件后触发） */
  onClick: (chartData: CustomChartData) => void;
  /** 点击未展开卡片时的回调（用于通知父组件展开此卡片） */
  onExpand?: () => void;
}

export interface CustomChartData {
  name: string;
  artist: string;
  charter: string;
  illustrator: string;
  codename: string;
  chart: any;
  chartString: string;
  musicBlob: Blob | null;
  illustrationBlob: Blob | null;
  lineTextureData: any[] | null;
  lineTextureImages: { name: string; blob: Blob }[];
  difficulty: string;
  level: string;
}

export default function ZipUploadCard({ expanded = true, onClick, onExpand }: ZipUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if ((target as HTMLImageElement).src != null) return;
    playClickSound();
    // 未展开 → 仅展开，不打开文件选择器
    if (!expanded) {
      onExpand?.();
      return;
    }
    // 已展开 → 打开文件选择器
    inputRef.current?.click();
  }, [expanded, onExpand]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus('解压中...');

    try {
      const zip = await JSZip.loadAsync(file);
      const files = Object.values(zip.files).filter(f => !f.dir);

      let chartFile: string | null = null;
      let chartString: string | null = null;
      let musicBlob: Blob | null = null;
      let illustrationBlob: Blob | null = null;
      let lineTextureJson: string | null = null;
      let lineTextureImages: { name: string; blob: Blob }[] = [];
      let meta: any = null;

      setStatus(`识别文件 (0/${files.length})`);

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const name = f.name;
        const baseName = name.split('/').pop() || name;
        const ext = baseName.split('.').pop()?.toLowerCase() || '';

        setStatus(`识别文件 (${i + 1}/${files.length}): ${baseName.substring(0, 20)}`);

        // line.json 优先识别（文件名以 line.json 结尾，可能在子目录里）
        if (baseName.toLowerCase() === 'line.json') {
          lineTextureJson = await f.async('text');
        } else if (ext === 'json') {
          // 可能是 meta.json 或谱面
          const text = await f.async('text');
          try {
            const json = JSON.parse(text);
            if (json.codename && json.musicFile) {
              // meta.json
              meta = json;
            } else if (json.formatVersion && json.judgeLineList) {
              // 谱面 JSON
              chartFile = name;
              chartString = text;
            }
            // line.json 是数组格式，parse 成功但不匹配上面两个分支，忽略
          } catch {}
        } else if (ext === 'pec') {
          const text = await f.async('text');
          chartFile = name;
          chartString = text;
        } else if (['mp3', 'ogg', 'wav', 'm4a'].includes(ext)) {
          musicBlob = await f.async('blob');
        } else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
          const blob = await f.async('blob');
          // 如果 meta 有 illustration 字段，匹配文件名
          if (meta?.illustration && name.endsWith(meta.illustration)) {
            illustrationBlob = blob;
          } else if (!illustrationBlob) {
            // 第一个图片作为曲绘
            illustrationBlob = blob;
          }
          // 收集所有图片（可能是判定线贴图）
          lineTextureImages.push({ name: baseName, blob });
        }
      }

      if (!chartString) {
        setStatus('错误: 未找到谱面文件 (.json 或 .pec)');
        setLoading(false);
        return;
      }

      // 解析谱面
      let chart;
      try {
        chart = chart123(JSON.parse(chartString));
      } catch {
        try {
          chart = chart123(chartp23(chartString, chartFile || undefined));
        } catch {
          setStatus('错误: 谱面解析失败');
          setLoading(false);
          return;
        }
      }

      // 解析 lineTexture
      let lineTextureData: any[] | null = null;
      if (lineTextureJson) {
        try {
          lineTextureData = JSON.parse(lineTextureJson);
        } catch {}
      }

      // 确定难度
      let difficulty = 'in';
      let level = 'in';
      if (meta) {
        if (meta.chartIN) { difficulty = 'in'; level = 'in'; }
        else if (meta.chartEZ) { difficulty = 'ez'; level = 'ez'; }
        else if (meta.chartHD) { difficulty = 'hd'; level = 'hd'; }
        else if (meta.chartAT) { difficulty = 'at'; level = 'at'; }
      }

      const chartData: CustomChartData = {
        name: meta?.name || chartFile || '自定义谱面',
        artist: meta?.artist || '未知',
        charter: meta?.chartDesigner || '未知',
        illustrator: meta?.illustrator || '未知',
        codename: 'custom',
        chart,
        chartString,
        musicBlob,
        illustrationBlob,
        lineTextureData,
        lineTextureImages: lineTextureImages.filter(img =>
          !meta?.illustration || !img.name.endsWith(meta.illustration)
        ),
        difficulty,
        level,
      };

      // 存到 IndexedDB（Blob）+ sessionStorage（文本）
      // IndexedDB 跨页面保留 Blob；sessionStorage 的 Blob URL 导航后会失效
      if (musicBlob) {
        await setBlob('music', musicBlob);
      }
      if (illustrationBlob) {
        await setBlob('illustration', illustrationBlob);
      }
      // 判定线贴图：line.json 文本存 sessionStorage，图片 Blob 存 IndexedDB
      // key 格式: "lineTex:文件名"，emulator 遍历 lineTextureData 时按 Image 字段取
      if (lineTextureJson) {
        sessionStorage.setItem('phi-custom-line-json', lineTextureJson);
        // 过滤掉曲绘图片，只存判定线贴图
        const texImages = lineTextureImages.filter(img =>
          !meta?.illustration || !img.name.endsWith(meta.illustration)
        );
        for (const img of texImages) {
          await setBlob('lineTex:' + img.name, img.blob);
        }
      }
      sessionStorage.setItem('phi-custom-chart', chartString);
      sessionStorage.setItem('phi-custom-meta', JSON.stringify({
        name: chartData.name,
        artist: chartData.artist,
        chartDesigner: chartData.charter,
        illustrator: chartData.illustrator,
      }));

      setStatus('加载完成!');
      onClick(chartData);
    } catch (err) {
      setStatus('错误: ' + (err as Error).message);
      setLoading(false);
    }

    // 重置 input 允许再次选择同一文件
    e.target.value = '';
  }, [onClick]);

  return (
    <div
      className={`cs-chapterContainer cs-zipCard${expanded ? ' cs-expanded' : ' cs-collapsed'}`}
      data-name="自定义 ZIP 上传"
      data-codename="custom"
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {loading && (
        <div className="cs-zipStatus" onClick={(e) => e.stopPropagation()}>
          {status}
        </div>
      )}
    </div>
  );
}
