'use client';

/**
 * Phi.ts — LevelChooser（4 难度选择器）
 *
 * 参考 phigros-on-html 的滑块平滑位移设计：
 *   - 独立滑块元素 .levelChooser-slider 覆盖在 levelItem 上
 *   - 切换难度时滑块通过 transition: left .3s ease-in-out 平滑移动
 *   - 滑块背景色随难度变化（ez 绿/hd 蓝/in 红/at 黑）
 */

import { difficultyList, type Difficulty, difficultyColors } from '@/lib/phigros/constants';
import type { SongMeta } from './SongList';
import { playClickSound } from '@/lib/phigros/page-transition';

export interface LevelChooserProps {
  /** 当前选中的难度 */
  selectedLevel: Difficulty;
  /** 正在淡入的难度（保留兼容，实际滑块不需要） */
  pendingLevel: Difficulty | null;
  /** 当前选中歌曲的 meta */
  songMeta: SongMeta | null;
  /** 选择难度回调 */
  onSelectLevel: (level: Difficulty) => void;
}

export function LevelChooser({
  selectedLevel,
  pendingLevel: _pendingLevel,
  songMeta,
  onSelectLevel,
}: LevelChooserProps) {
  // 滑块位置：ez=0%, hd=25%, in=50%, at=75%
  const selectedIndex = difficultyList.indexOf(selectedLevel);
  const sliderLeft = `${selectedIndex * 25}%`;

  return (
    <div className="levelChooser" role="radiogroup" aria-label="难度选择">
      {/* 独立滑块元素（参考 phigros-on-html #song-dfcy-focus） */}
      <div
        className="levelChooser-slider"
        style={{
          left: sliderLeft,
          backgroundColor: difficultyColors[selectedLevel],
        }}
        aria-hidden="true"
      />
      {difficultyList.map((level) => {
        const ranking = songMeta
          ? Math.floor(Number(songMeta[`${level}Ranking`]) || 0)
          : 0;

        const classes = ['levelItem', level];
        if (level === selectedLevel) classes.push('selected');

        return (
          <div
            key={level}
            className={classes.join(' ')}
            data-level={ranking}
            onClick={() => { playClickSound(); onSelectLevel(level); }}
            role="radio"
            tabIndex={0}
            aria-checked={level === selectedLevel}
            aria-label={`难度 ${level.toUpperCase()} 定数 ${ranking}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectLevel(level);
              }
            }}
          />
        );
      })}
    </div>
  );
}
