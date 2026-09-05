import React from 'react';
import { VisualizerMode, ThemeProfile } from '../types';

interface NavBarProps {
  currentMode: VisualizerMode;
  themeIdx: number;
  themes: ThemeProfile[];
  onSelectMode: (mode: VisualizerMode) => void;
  onSelectTheme: (idx: number) => void;
}

const MODES: { id: VisualizerMode; label: string }[] = [
  { id: 'bars', label: 'BARS' },
  { id: 'mirror', label: 'MIRROR' },
  { id: 'wave', label: 'WAVE' },
  { id: 'circle', label: 'CIRCLE' },
  { id: 'scope', label: 'SCOPE' },
  { id: 'hexagon', label: 'HEX' },
];

export const NavBar: React.FC<NavBarProps> = ({
  currentMode,
  themeIdx,
  themes,
  onSelectMode,
  onSelectTheme,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 my-3.5">
      {/* Mode Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        {MODES.map((m) => {
          const isActive = currentMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelectMode(m.id)}
              className={`px-3 py-1.5 text-[10px] font-bold tracking-[1.5px] rounded border transition-all cursor-pointer select-none font-mono ${
                isActive
                  ? 'bg-[#00f2fe]/10 border-[#00f2fe] text-[#00f2fe] shadow-[0_0_10px_rgba(0,242,254,0.35)]'
                  : 'bg-[#090e17] border-[#162236] text-[#51627c] hover:border-[#00f2fe]/50 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Theme Color Presets */}
      <div className="flex flex-wrap items-center gap-1.5">
        {themes.map((t, idx) => {
          const isActive = themeIdx === idx;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTheme(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-[1.5px] rounded border transition-all cursor-pointer select-none font-mono ${
                isActive
                  ? 'border-current shadow-[0_0_10px_rgba(255,255,255,0.15)] bg-white/5'
                  : 'bg-[#090e17] border-[#162236] text-[#51627c] hover:border-slate-500 hover:text-white'
              }`}
              style={{
                color: isActive ? t.primary : undefined,
                borderColor: isActive ? t.primary : undefined,
                boxShadow: isActive ? `0 0 8px ${t.primary}55` : undefined,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: t.primary, boxShadow: `0 0 5px ${t.primary}` }}
              />
              {t.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
