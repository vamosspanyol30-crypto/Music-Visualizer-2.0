import React from 'react';
import { Sliders, RotateCcw } from 'lucide-react';
import { EQSettings, FXSettings } from '../types';
import { RotaryKnob } from './RotaryKnob';

interface MixerModuleProps {
  volume: number;
  eq: EQSettings;
  fx: FXSettings;
  themeAccent: string;
  onVolumeChange: (val: number) => void;
  onEQChange: (eq: EQSettings) => void;
  onFXChange: (fx: FXSettings) => void;
}

export const MixerModule: React.FC<MixerModuleProps> = ({
  volume,
  eq,
  fx,
  themeAccent,
  onVolumeChange,
  onEQChange,
  onFXChange,
}) => {
  const handleBassChange = (val: number) => onEQChange({ ...eq, bass: val });
  const handleMidChange = (val: number) => onEQChange({ ...eq, mid: val });
  const handleTrebleChange = (val: number) => onEQChange({ ...eq, treble: val });

  const toggleKillBass = () => {
    onEQChange({ ...eq, bass: eq.bass <= -20 ? 0 : -26 });
  };

  const toggleKillMid = () => {
    onEQChange({ ...eq, mid: eq.mid <= -18 ? 0 : -24 });
  };

  const toggleKillTreble = () => {
    onEQChange({ ...eq, treble: eq.treble <= -18 ? 0 : -24 });
  };

  const handleResetEQ = () => {
    onEQChange({ bass: 0, mid: 0, treble: 0 });
  };

  const handleFXChange = (key: keyof FXSettings, val: number) => {
    onFXChange({ ...fx, [key]: val });
  };

  return (
    <div className="bg-[#06090e] border border-[#111824] rounded p-3 flex flex-col justify-between h-full relative">
      {/* Module Title */}
      <div className="flex items-center justify-between border-b border-[#111824] pb-1.5 mb-2.5">
        <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-[2px] text-[#435269]">
          <Sliders className="w-3 h-3 text-[#00f2fe]" />
          <span>MIXER // 3-BAND EQ & DSP FX</span>
        </div>
        <button
          onClick={handleResetEQ}
          className="flex items-center gap-1 text-[8px] font-mono text-[#51627c] hover:text-white px-1.5 py-0.5 rounded border border-[#162236] cursor-pointer"
          title="Reset EQ sliders to 0 dB"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>ZERO EQ</span>
        </button>
      </div>

      {/* Faders Section (VOL, BASS, MID, TREBLE) */}
      <div className="flex flex-col gap-2 my-1">
        {/* Master Volume */}
        <div className="flex items-center gap-2">
          <div className="w-16 shrink-0">
            <span className="text-[10px] font-bold text-[#00f2fe] font-mono tracking-wider block">
              VOL
            </span>
            <span className="text-[8px] font-mono text-[#435269]">MASTER</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="rack-slider flex-grow cursor-pointer"
            style={{ '--slider-thumb': '#00f2fe' } as React.CSSProperties}
          />
          <span className="text-[10px] font-mono text-white w-7 text-right">
            {Math.round(volume * 100)}
          </span>
          <div className="w-10" />
        </div>

        {/* Bass Fader with DJ KILL */}
        <div className="flex items-center gap-2">
          <div className="w-16 shrink-0">
            <span className="text-[10px] font-bold text-[#ff2a74] font-mono tracking-wider block">
              BASS
            </span>
            <span className="text-[8px] font-mono text-[#714050]">280 Hz</span>
          </div>
          <input
            type="range"
            min="-26"
            max="14"
            step="1"
            value={eq.bass}
            onChange={(e) => handleBassChange(parseInt(e.target.value))}
            className="rack-slider flex-grow cursor-pointer"
            style={{ '--slider-thumb': '#ff2a74' } as React.CSSProperties}
          />
          <span className="text-[10px] font-mono text-white w-7 text-right">
            {eq.bass > 0 ? `+${eq.bass}` : eq.bass}
          </span>
          <button
            onClick={toggleKillBass}
            className={`w-10 text-[8px] font-mono font-bold py-0.5 rounded border transition-all cursor-pointer ${
              eq.bass <= -20
                ? 'bg-[#ff2a74] text-black border-[#ff2a74] shadow-[0_0_8px_rgba(255,42,116,0.6)]'
                : 'border-[#381a28] text-[#ff2a74]/70 hover:text-[#ff2a74] hover:border-[#ff2a74]'
            }`}
            title="Instant Bass Kill switch (-26dB)"
          >
            KILL
          </button>
        </div>

        {/* Mid Fader with DJ KILL */}
        <div className="flex items-center gap-2">
          <div className="w-16 shrink-0">
            <span className="text-[10px] font-bold text-[#00ffcc] font-mono tracking-wider block">
              MID
            </span>
            <span className="text-[8px] font-mono text-[#255248]">1.1 kHz</span>
          </div>
          <input
            type="range"
            min="-24"
            max="12"
            step="1"
            value={eq.mid}
            onChange={(e) => handleMidChange(parseInt(e.target.value))}
            className="rack-slider flex-grow cursor-pointer"
            style={{ '--slider-thumb': '#00ffcc' } as React.CSSProperties}
          />
          <span className="text-[10px] font-mono text-white w-7 text-right">
            {eq.mid > 0 ? `+${eq.mid}` : eq.mid}
          </span>
          <button
            onClick={toggleKillMid}
            className={`w-10 text-[8px] font-mono font-bold py-0.5 rounded border transition-all cursor-pointer ${
              eq.mid <= -18
                ? 'bg-[#00ffcc] text-black border-[#00ffcc] shadow-[0_0_8px_rgba(0,255,204,0.6)]'
                : 'border-[#1b3d36] text-[#00ffcc]/70 hover:text-[#00ffcc] hover:border-[#00ffcc]'
            }`}
            title="Instant Mid Kill switch (-24dB)"
          >
            KILL
          </button>
        </div>

        {/* Treble Fader with DJ KILL */}
        <div className="flex items-center gap-2">
          <div className="w-16 shrink-0">
            <span className="text-[10px] font-bold text-[#b06eff] font-mono tracking-wider block">
              TREBLE
            </span>
            <span className="text-[8px] font-mono text-[#4b3563]">3.2 kHz</span>
          </div>
          <input
            type="range"
            min="-24"
            max="14"
            step="1"
            value={eq.treble}
            onChange={(e) => handleTrebleChange(parseInt(e.target.value))}
            className="rack-slider flex-grow cursor-pointer"
            style={{ '--slider-thumb': '#b06eff' } as React.CSSProperties}
          />
          <span className="text-[10px] font-mono text-white w-7 text-right">
            {eq.treble > 0 ? `+${eq.treble}` : eq.treble}
          </span>
          <button
            onClick={toggleKillTreble}
            className={`w-10 text-[8px] font-mono font-bold py-0.5 rounded border transition-all cursor-pointer ${
              eq.treble <= -18
                ? 'bg-[#b06eff] text-black border-[#b06eff] shadow-[0_0_8px_rgba(176,110,255,0.6)]'
                : 'border-[#392451] text-[#b06eff]/70 hover:text-[#b06eff] hover:border-[#b06eff]'
            }`}
            title="Instant Treble Kill switch (-24dB)"
          >
            KILL
          </button>
        </div>
      </div>

      {/* DSP FX Rotary Knobs Row */}
      <div className="grid grid-cols-4 gap-2 pt-2.5 mt-2 border-t border-[#111824]">
        <RotaryKnob
          label="REVERB"
          value={fx.reverb}
          accentColor="#00f2fe"
          onChange={(v) => handleFXChange('reverb', v)}
          onReset={() => handleFXChange('reverb', 0)}
        />
        <RotaryKnob
          label="DELAY"
          value={fx.delay}
          accentColor="#00ff88"
          onChange={(v) => handleFXChange('delay', v)}
          onReset={() => handleFXChange('delay', 0)}
        />
        <RotaryKnob
          label="FLANGE"
          value={fx.flange}
          accentColor="#b06eff"
          onChange={(v) => handleFXChange('flange', v)}
          onReset={() => handleFXChange('flange', 0)}
        />
        <RotaryKnob
          label="CRUSH"
          value={fx.crush}
          accentColor="#ff2a74"
          onChange={(v) => handleFXChange('crush', v)}
          onReset={() => handleFXChange('crush', 0)}
        />
      </div>
    </div>
  );
};
