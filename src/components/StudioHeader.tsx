import React, { useState } from 'react';
import { Mic, MicOff, Music, Sparkles, HelpCircle, Activity, Volume2, VolumeX, Youtube } from 'lucide-react';
import { PlaybackStatus } from '../types';

interface StudioHeaderProps {
  status: PlaybackStatus;
  sampleRate: number;
  isMicActive: boolean;
  isMuted: boolean;
  onToggleMic: () => void;
  onToggleMute: () => void;
  onLoadDemoTrack: () => void;
  onOpenStreamModal?: () => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  status,
  sampleRate,
  isMicActive,
  isMuted,
  onToggleMic,
  onToggleMute,
  onLoadDemoTrack,
  onOpenStreamModal,
}) => {
  const [showHelp, setShowHelp] = useState(false);

  // Status LED color mapping
  const getLedStyles = () => {
    switch (status) {
      case 'PLAYING':
        return 'bg-[#00ff88] shadow-[0_0_12px_#00ff88] animate-pulse';
      case 'LIVE MIC':
        return 'bg-[#00f2fe] shadow-[0_0_12px_#00f2fe] animate-ping';
      case 'TAB STREAM':
        return 'bg-[#00f2fe] shadow-[0_0_12px_#00f2fe] animate-pulse';
      case 'DECODING...':
        return 'bg-[#ffb700] shadow-[0_0_10px_#ffb700] animate-bounce';
      case 'PAUSED':
        return 'bg-[#ffb700] shadow-[0_0_8px_#ffb700]';
      case 'READY TO MIX':
        return 'bg-[#00f2fe] shadow-[0_0_8px_#00f2fe]';
      default:
        return 'bg-[#ff3333] shadow-[0_0_6px_#ff3333]';
    }
  };

  return (
    <header className="border-b border-[#141b29] pb-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Hardware Series */}
        <div className="flex items-center gap-3">
          <div className="flex items-baseline tracking-widest font-black text-2xl select-none">
            <span className="text-[#00bfff] drop-shadow-[0_0_12px_rgba(0,191,255,0.6)] font-['Orbitron',sans-serif]">
              PULSE
            </span>
            <span className="text-[#ff007f] drop-shadow-[0_0_12px_rgba(255,0,127,0.6)] font-['Orbitron',sans-serif] ml-1">
              FX
            </span>
            <span className="text-[10px] text-[#415066] tracking-wider ml-2 font-mono uppercase px-1.5 py-0.5 rounded border border-[#162236] bg-[#070a0f]">
              DSP-RACK MKII
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-[#51627c] border-l border-[#162236] pl-3">
            <Activity className="w-3.5 h-3.5 text-[#00f2fe]" />
            <span>{(sampleRate / 1000).toFixed(1)} kHz</span>
            <span className="text-[#253347]">|</span>
            <span>32-BIT FLOAT</span>
          </div>
        </div>

        {/* Quick Toolbar & Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Demo Beat Button */}
          <button
            id="btn-demo-beat"
            onClick={onLoadDemoTrack}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wider rounded border border-[#00aa5b]/40 bg-[#00ff88]/5 text-[#00ff88] hover:bg-[#00ff88]/15 hover:border-[#00ff88] hover:shadow-[0_0_10px_rgba(0,255,136,0.3)] transition-all cursor-pointer"
            title="Launch built-in Cyberpunk synthwave beat"
          >
            <Sparkles className="w-3 h-3 text-[#00ff88]" />
            <span>SYNTH DEMO</span>
          </button>

          {/* YouTube / Stream Button */}
          {onOpenStreamModal && (
            <button
              id="btn-open-youtube-stream"
              onClick={onOpenStreamModal}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wider rounded border border-[#ff0033]/40 bg-[#ff0033]/10 text-white hover:bg-[#ff0033]/25 hover:border-[#ff0033] hover:shadow-[0_0_10px_rgba(255,0,51,0.3)] transition-all cursor-pointer"
              title="Open YouTube & Stream Audio Loader"
            >
              <Youtube className="w-3 h-3 text-[#ff0033]" />
              <span className="hidden sm:inline">YOUTUBE / URL</span>
            </button>
          )}

          {/* Live Mic Button */}
          <button
            id="btn-mic-input"
            onClick={onToggleMic}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wider rounded border transition-all cursor-pointer ${
              isMicActive
                ? 'border-[#00f2fe] bg-[#00f2fe]/20 text-[#00f2fe] shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                : 'border-[#162236] bg-[#090e17] text-[#51627c] hover:border-[#00f2fe]/50 hover:text-white'
            }`}
            title="Toggle Live Microphone Visualizer"
          >
            {isMicActive ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            <span className="hidden sm:inline">MIC IN</span>
          </button>

          {/* Mute Master Toggle */}
          <button
            id="btn-quick-mute"
            onClick={onToggleMute}
            className={`p-1.5 rounded border transition-all cursor-pointer ${
              isMuted
                ? 'border-[#ff007f] bg-[#ff007f]/20 text-[#ff007f]'
                : 'border-[#162236] bg-[#090e17] text-[#51627c] hover:text-white'
            }`}
            title={isMuted ? 'Unmute Master' : 'Mute Master'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Help Shortcuts */}
          <button
            id="btn-help"
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 rounded border border-[#162236] bg-[#090e17] text-[#51627c] hover:text-[#00f2fe] hover:border-[#00f2fe]/40 transition-all cursor-pointer"
            title="Keyboard Shortcuts & Studio Info"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {/* Status LED & Readout */}
          <div className="flex items-center gap-2 bg-[#05080e] px-3 py-1 rounded border border-[#141c2c]">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${getLedStyles()}`} />
            <span className="text-[10px] font-mono tracking-widest text-[#a0aec0] font-bold select-none">
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Help Shortcuts Drawer */}
      {showHelp && (
        <div className="mt-3 p-3 bg-[#06090e] border border-[#162236] rounded text-[11px] text-[#72829c] grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in duration-200">
          <div><span className="text-[#00f2fe] font-bold font-mono">SPACE</span> : Play / Pause</div>
          <div><span className="text-[#00f2fe] font-bold font-mono">L</span> : Toggle Loop</div>
          <div><span className="text-[#00f2fe] font-bold font-mono">M</span> : Mute Audio</div>
          <div><span className="text-[#00f2fe] font-bold font-mono">1 - 6</span> : Switch Visualizers</div>
          <div><span className="text-[#ff007f] font-bold font-mono">DRAG FILE</span> : Load Track</div>
          <div><span className="text-[#ff007f] font-bold font-mono">KNOBS</span> : Drag Up/Down to Adjust</div>
          <div><span className="text-[#ff007f] font-bold font-mono">DBL-CLICK KNOB</span> : Reset FX to Zero</div>
          <div><span className="text-[#ff007f] font-bold font-mono">TIMELINE</span> : Click to Seek Track</div>
        </div>
      )}
    </header>
  );
};
