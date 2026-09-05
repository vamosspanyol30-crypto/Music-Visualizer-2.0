import React, { useRef } from 'react';
import { Upload, RotateCcw, Play, Pause, Square, Disc, Youtube, Globe } from 'lucide-react';
import { TrackMetadata } from '../types';

interface DeckModuleProps {
  metadata: TrackMetadata | null;
  isPlaying: boolean;
  isLooping: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  accentColor: string;
  isTabAudioActive?: boolean;
  currentYouTubeId?: string | null;
  onPlayPause: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
  onCue: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onFileUpload: (file: File) => void;
  onOpenStreamModal: () => void;
  onPlayPreset?: (preset: 'CYBERPUNK' | 'HOUSE' | 'TRAP') => void;
}

export const DeckModule: React.FC<DeckModuleProps> = ({
  metadata,
  isPlaying,
  isLooping,
  currentTime,
  duration,
  playbackRate,
  accentColor,
  isTabAudioActive = false,
  currentYouTubeId = null,
  onPlayPause,
  onStop,
  onToggleLoop,
  onCue,
  onPlaybackRateChange,
  onFileUpload,
  onOpenStreamModal,
  onPlayPreset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDigits = (secs: number) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const pitchPercent = Math.round((playbackRate - 1.0) * 100);

  return (
    <div className="bg-[#06090e] border border-[#111824] rounded p-3 flex flex-col justify-between h-full relative group">
      {/* Module Title with Hardware Bolt styling */}
      <div className="flex items-center justify-between border-b border-[#111824] pb-1.5 mb-2.5">
        <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-[2px] text-[#435269]">
          <Disc className={`w-3 h-3 ${isPlaying ? 'text-[#00f2fe] animate-spin' : 'text-[#435269]'}`} />
          <span>DECK 01 // AUDIO SOURCE</span>
        </div>
        <span className="text-[8px] font-mono text-[#2c3747]">PITCH: {pitchPercent > 0 ? `+${pitchPercent}` : pitchPercent}%</span>
      </div>

      <div className="flex flex-col items-center justify-center flex-grow py-1">
        {/* Source Action Buttons Row (File upload + YouTube/Stream URL) */}
        <div className="grid grid-cols-2 gap-2 w-full mb-2">
          {/* Load Local File */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 bg-[#00ff88]/5 border border-[#00aa5b]/40 text-[#00ff88] py-1.5 px-2 text-[10px] font-bold tracking-wider rounded hover:bg-[#00ff88]/15 hover:border-[#00ff88] transition-all cursor-pointer truncate"
            title="Upload audio from computer (.mp3, .wav, .flac, .ogg)"
          >
            <Upload className="w-3 h-3 shrink-0" />
            <span className="truncate">LOAD FILE</span>
          </button>

          {/* YouTube & Web URL Stream */}
          <button
            onClick={onOpenStreamModal}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold tracking-wider rounded border transition-all cursor-pointer truncate ${
              currentYouTubeId
                ? 'bg-[#ff0033]/15 border-[#ff0033] text-white shadow-[0_0_8px_rgba(255,0,51,0.3)]'
                : 'bg-[#ff0033]/5 border-[#ff0033]/40 text-[#ff3355] hover:bg-[#ff0033]/15 hover:border-[#ff0033]'
            }`}
            title="Add YouTube link or Web Audio URL stream"
          >
            <Youtube className="w-3 h-3 shrink-0 text-[#ff0033]" />
            <span className="truncate">YOUTUBE / URL</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Track Title & Metadata Tag */}
        <div className="w-full text-center px-2 mb-2">
          <p
            className="text-[10px] font-mono text-[#72829c] font-medium truncate"
            title={metadata?.title || 'NO LIVE STREAM DETECTED'}
          >
            {metadata ? metadata.title.toUpperCase() : 'NO LIVE STREAM DETECTED'}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[8px] text-[#415066] font-mono uppercase mt-0.5">
            <span>{metadata?.format || 'OFFLINE'}</span>
            <span>•</span>
            <span>{metadata?.channels ? `${metadata.channels} CH` : 'STEREO'}</span>
            <span>•</span>
            <span className="text-[#00f2fe]">
              {isTabAudioActive
                ? 'TAB AUDIO SYNC'
                : metadata?.youtubeId
                ? 'YOUTUBE SYNC'
                : metadata?.isBuiltInDemo
                ? 'SYNTH ENGINE'
                : 'BUFFER'}
            </span>
          </div>
        </div>

        {/* Big Neon Digital LCD Time Counter */}
        <div
          className="text-3xl font-light font-mono tracking-wider my-1 text-[#00f2fe] drop-shadow-[0_0_12px_rgba(0,242,254,0.4)] select-none"
          style={{ color: accentColor, textShadow: `0 0 15px ${accentColor}66` }}
        >
          {formatDigits(currentTime)}
          <span className="text-xs text-[#51627c] ml-1 font-mono font-normal">
            / {formatDigits(duration)}
          </span>
        </div>

        {/* Transport Circle Row (Loop, Play/Pause, Stop, Cue) */}
        <div className="flex items-center justify-center gap-3 my-2.5">
          {/* Loop Button */}
          <button
            onClick={onToggleLoop}
            className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs transition-all cursor-pointer ${
              isLooping
                ? 'border-[#00f2fe] text-[#00f2fe] bg-[#00f2fe]/10 shadow-[0_0_8px_rgba(0,242,254,0.3)]'
                : 'border-[#222d3d] text-[#51627c] hover:border-white hover:text-white'
            }`}
            title="Loop Track (L)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Master Circle Play/Pause Button */}
          <button
            onClick={onPlayPause}
            className="w-13 h-13 rounded-full border flex items-center justify-center text-lg transition-all cursor-pointer shadow-lg active:scale-95"
            style={{
              borderColor: accentColor,
              color: isPlaying ? '#000' : accentColor,
              backgroundColor: isPlaying ? accentColor : 'transparent',
              boxShadow: isPlaying ? `0 0 16px ${accentColor}` : `0 0 8px ${accentColor}33`,
            }}
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Stop Button */}
          <button
            onClick={onStop}
            className="w-9 h-9 rounded-full border border-[#222d3d] text-[#51627c] flex items-center justify-center text-xs hover:border-[#ff3333] hover:text-[#ff3333] hover:shadow-[0_0_8px_rgba(255,51,51,0.3)] transition-all cursor-pointer"
            title="Stop Track"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Cue Button */}
          <button
            onClick={onCue}
            className="w-9 h-9 rounded-full border border-[#222d3d] text-[#51627c] flex items-center justify-center text-[9px] font-bold font-mono hover:border-amber-400 hover:text-amber-400 transition-all cursor-pointer"
            title="Cue to Start"
          >
            CUE
          </button>
        </div>

        {/* Pitch / Playback Rate Slider */}
        <div className="w-full mt-2 pt-2 border-t border-[#111824] flex items-center gap-2 text-[9px] font-mono">
          <span className="text-[#435269] w-10">TEMPO</span>
          <input
            type="range"
            min="0.85"
            max="1.15"
            step="0.01"
            value={playbackRate}
            onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
            className="rack-slider flex-grow cursor-pointer"
            style={{ '--slider-thumb': accentColor } as React.CSSProperties}
          />
          <button
            onClick={() => onPlaybackRateChange(1.0)}
            className="text-[8px] text-[#51627c] hover:text-white px-1 py-0.5 rounded border border-[#162236] cursor-pointer"
            title="Reset Tempo to 1.0x"
          >
            RST
          </button>
        </div>
      </div>
    </div>
  );
};

