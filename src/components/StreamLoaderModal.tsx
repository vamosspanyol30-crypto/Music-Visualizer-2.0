import React, { useState } from 'react';
import {
  Youtube,
  Globe,
  X,
  Play,
  Share2,
  Mic,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Radio,
  Sparkles,
  Volume2
} from 'lucide-react';
import { TrackMetadata } from '../types';

interface StreamLoaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
  isTabAudioActive: boolean;
  isMicActive: boolean;
  onStartTabAudio: () => Promise<boolean>;
  onStopTabAudio: () => void;
  onToggleMic: () => Promise<void>;
  onLoadDirectUrl: (url: string, title?: string) => Promise<void>;
  onSelectYouTubeTrack: (videoId: string, title: string) => void;
  currentYouTubeId: string | null;
}

interface YouTubePreset {
  title: string;
  id: string;
  genre: string;
  author: string;
}

interface DirectAudioPreset {
  title: string;
  url: string;
  genre: string;
}

const YOUTUBE_PRESETS: YouTubePreset[] = [
  {
    title: 'Cyberpunk 2077 Night City Beats',
    id: 'b42zJb-l53A',
    genre: 'CYBERPUNK // BASS',
    author: 'Cyber City Beats',
  },
  {
    title: 'Lofi Girl - Synthwave Chill Radio',
    id: '4xDzrJKXOOY',
    genre: 'SYNTHWAVE // RETRO',
    author: 'Lofi Girl',
  },
  {
    title: 'NCS Electronic Bass & Drops',
    id: 'K4DyBUG242c',
    genre: 'ELECTRONIC // DANCE',
    author: 'NoCopyrightSounds',
  },
  {
    title: 'Retrowave 80s Neon Drive',
    id: 'MVPTGNGiI-4',
    genre: 'RETROWAVE // OUTRUN',
    author: 'Astral Throb',
  },
];

const DIRECT_AUDIO_PRESETS: DirectAudioPreset[] = [
  {
    title: 'Cyber Synthwave Stems (Direct Stream)',
    url: 'https://actions.google.com/sounds/v1/science_fiction/scifi_hum_large.ogg',
    genre: 'SCI-FI PULSE',
  },
  {
    title: 'Analog Space Drone (Direct Stream)',
    url: 'https://actions.google.com/sounds/v1/science_fiction/alien_hum.ogg',
    genre: 'ATMOSPHERE',
  },
  {
    title: 'Industrial Machine Rhythms',
    url: 'https://actions.google.com/sounds/v1/science_fiction/servo_motor_whine.ogg',
    genre: 'INDUSTRIAL',
  },
];

// Helper to extract YouTube 11-char ID
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

export const StreamLoaderModal: React.FC<StreamLoaderModalProps> = ({
  isOpen,
  onClose,
  accentColor,
  isTabAudioActive,
  isMicActive,
  onStartTabAudio,
  onStopTabAudio,
  onToggleMic,
  onLoadDirectUrl,
  onSelectYouTubeTrack,
  currentYouTubeId,
}) => {
  const [activeTab, setActiveTab] = useState<'youtube' | 'direct'>('youtube');
  const [youtubeInput, setYoutubeInput] = useState('');
  const [directUrlInput, setDirectUrlInput] = useState('');
  const [isLoadingDirect, setIsLoadingDirect] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoadYouTube = (idOrUrl: string, title?: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const videoId = extractYouTubeId(idOrUrl);
    if (!videoId) {
      setErrorMessage('Invalid YouTube URL or ID. Please check the link.');
      return;
    }
    const resolvedTitle = title || `YOUTUBE // ${videoId}`;
    onSelectYouTubeTrack(videoId, resolvedTitle);
    onClose();
  };

  const handleDirectUrlSubmit = async (url: string, title?: string) => {
    if (!url.trim()) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoadingDirect(true);
    try {
      await onLoadDirectUrl(url.trim(), title);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err?.message ||
          'Failed to load remote audio stream. The host server might block cross-origin (CORS) requests.'
      );
    } finally {
      setIsLoadingDirect(false);
    }
  };

  const handleCaptureTabAudio = async () => {
    setErrorMessage(null);
    try {
      if (isTabAudioActive) {
        onStopTabAudio();
        setSuccessMessage('Tab audio capture disconnected.');
      } else {
        await onStartTabAudio();
        setSuccessMessage('Tab audio stream connected to visualizer & DSP chain!');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Could not start tab audio capture. Please make sure to check "Share tab audio" in the browser dialog.'
      );
    }
  };

  return (
    <div
      id="stream-loader-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="w-full max-w-2xl bg-[#090d14] border border-[#1b2738] rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#141d2a] bg-[#05080d]">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: accentColor }}
            />
            <span className="text-[11px] font-mono font-bold tracking-[2px] text-white">
              DECK STREAM SOURCE // YOUTUBE & WEB AUDIO
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-white p-1 rounded hover:bg-[#141e2e] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#141d2a] bg-[#070b10] px-4 pt-2 gap-2 text-[10px] font-mono">
          <button
            onClick={() => {
              setActiveTab('youtube');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-1.5 py-2 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'youtube'
                ? 'border-[#ff0033] text-[#ff0033] font-bold bg-[#ff0033]/5'
                : 'border-transparent text-[#71829a] hover:text-white'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>YOUTUBE VIDEO SYNC</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('direct');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-1.5 py-2 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'direct'
                ? 'border-[#00f2fe] text-[#00f2fe] font-bold bg-[#00f2fe]/5'
                : 'border-transparent text-[#71829a] hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>DIRECT AUDIO URL (.MP3 / .OGG)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs font-mono">
          {/* Notifications / Alerts */}
          {errorMessage && (
            <div className="p-2.5 bg-[#ff2a74]/10 border border-[#ff2a74]/40 rounded text-[#ff6699] text-[10px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-2 bg-[#00ff88]/10 border border-[#00ff88]/40 rounded text-[#00ff88] text-[10px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: YOUTUBE VIDEO SYNC */}
          {activeTab === 'youtube' && (
            <div className="space-y-4">
              {/* Input Box */}
              <div>
                <label className="block text-[9px] text-[#71829a] uppercase tracking-wider mb-1.5">
                  Enter YouTube Video Link or Video ID:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      placeholder="e.g. https://www.youtube.com/watch?v=4xDzrJKXOOY or b42zJb-l53A"
                      value={youtubeInput}
                      onChange={(e) => setYoutubeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleLoadYouTube(youtubeInput);
                      }}
                      className="w-full bg-[#04060a] border border-[#1b2738] rounded px-3 py-2 text-white text-[11px] font-mono focus:outline-none focus:border-[#ff0033]"
                    />
                  </div>
                  <button
                    onClick={() => handleLoadYouTube(youtubeInput)}
                    className="flex items-center gap-1.5 bg-[#ff0033] hover:bg-[#cc0029] text-white px-4 py-2 rounded text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>LOAD</span>
                  </button>
                </div>
              </div>

              {/* Real-time Audio Routing Callout */}
              <div className="bg-[#05080e] border border-[#162438] rounded-md p-3 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-white tracking-wider">
                    <Volume2 className="w-3.5 h-3.5 text-[#00f2fe]" />
                    <span>VISUALIZER & DSP AUDIO SYNC</span>
                  </div>
                  <span
                    className={`text-[8px] font-mono px-2 py-0.5 rounded-full border ${
                      isTabAudioActive
                        ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/40 shadow-[0_0_8px_rgba(0,255,136,0.3)]'
                        : isMicActive
                        ? 'bg-[#ffb700]/10 text-[#ffb700] border-[#ffb700]/40'
                        : 'bg-[#1e293b]/40 text-[#64748b] border-[#1e293b]'
                    }`}
                  >
                    {isTabAudioActive
                      ? '● TAB AUDIO CAPTURED'
                      : isMicActive
                      ? '● MIC LISTENING'
                      : 'STANDBY (DESYNCED)'}
                  </span>
                </div>

                <p className="text-[9px] text-[#8696ab] leading-relaxed mb-3">
                  <strong className="text-[#00ff88]">⚡ DIRECT DJ RACK ROUTING:</strong> Any YouTube video loaded will be automatically extracted and decoded directly into Deck 1. Your 3-band EQ (<strong className="text-white">Bass, Mid, Treble</strong>), Master Volume, Tempo pitch, and live DSP FX (<strong className="text-white">Flanger, Bitcrusher, Delay, Reverb</strong>) directly shape the song live!
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCaptureTabAudio}
                    className={`flex items-center gap-2 py-1.5 px-3 rounded text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                      isTabAudioActive
                        ? 'bg-[#ff2a74]/15 border border-[#ff2a74] text-[#ff2a74] hover:bg-[#ff2a74]/25 shadow-[0_0_10px_rgba(255,42,116,0.3)]'
                        : 'bg-[#00f2fe] text-black hover:bg-[#38f8ff] shadow-[0_0_12px_rgba(0,242,254,0.3)]'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>
                      {isTabAudioActive ? 'DISCONNECT TAB AUDIO' : '⚡ CAPTURE TAB AUDIO TO VISUALIZER'}
                    </span>
                  </button>

                  <button
                    onClick={onToggleMic}
                    className={`flex items-center gap-1.5 py-1.5 px-3 rounded border text-[10px] transition-all cursor-pointer ${
                      isMicActive
                        ? 'border-[#ffb700] text-[#ffb700] bg-[#ffb700]/10'
                        : 'border-[#1b2738] text-[#8696ab] hover:border-white hover:text-white'
                    }`}
                    title="Use microphone to listen to your laptop or desktop speakers"
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isMicActive ? 'STOP MIC' : 'OR USE MIC LOOP'}</span>
                  </button>
                </div>
              </div>

              {/* YouTube Embedded Player Preview */}
              {currentYouTubeId && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] text-[#71829a]">
                    <span>EMBEDDED YOUTUBE DECK</span>
                    <a
                      href={`https://www.youtube.com/watch?v=${currentYouTubeId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#00f2fe] hover:underline flex items-center gap-1"
                    >
                      <span>Open on YouTube</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="relative aspect-video w-full rounded border border-[#1b2738] overflow-hidden bg-black shadow-inner">
                    <iframe
                      src={`https://www.youtube.com/embed/${currentYouTubeId}?autoplay=1&enablejsapi=1`}
                      title="YouTube player"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Curated YouTube Presets */}
              <div>
                <div className="flex items-center gap-1.5 text-[9px] text-[#71829a] uppercase tracking-wider mb-2">
                  <Sparkles className="w-3 h-3 text-[#ff0033]" />
                  <span>Curated Music Stream Presets:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {YOUTUBE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleLoadYouTube(preset.id, preset.title)}
                      className={`flex flex-col text-left p-2.5 rounded border transition-all cursor-pointer ${
                        currentYouTubeId === preset.id
                          ? 'border-[#ff0033] bg-[#ff0033]/10 text-white shadow-[0_0_10px_rgba(255,0,51,0.2)]'
                          : 'border-[#141e2b] bg-[#070b12] text-[#8696ab] hover:border-[#223349] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[8px] font-mono text-[#ff0033]">
                          {preset.genre}
                        </span>
                        <Play className="w-2.5 h-2.5 text-[#ff0033]" />
                      </div>
                      <span className="text-[10px] font-bold font-mono text-white truncate w-full">
                        {preset.title}
                      </span>
                      <span className="text-[8px] text-[#4f617a] font-mono mt-0.5">
                        {preset.author}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT WEB AUDIO URL */}
          {activeTab === 'direct' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] text-[#71829a] uppercase tracking-wider mb-1.5">
                  Direct Web Audio Link (.mp3, .wav, .ogg, online radio stream):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/stream/track.mp3"
                    value={directUrlInput}
                    onChange={(e) => setDirectUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleDirectUrlSubmit(directUrlInput);
                    }}
                    className="flex-grow bg-[#04060a] border border-[#1b2738] rounded px-3 py-2 text-white text-[11px] font-mono focus:outline-none focus:border-[#00f2fe]"
                  />
                  <button
                    onClick={() => handleDirectUrlSubmit(directUrlInput)}
                    disabled={isLoadingDirect}
                    className="flex items-center gap-1.5 bg-[#00f2fe] hover:bg-[#38f8ff] text-black px-4 py-2 rounded text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isLoadingDirect ? 'DECODING...' : 'LOAD URL'}</span>
                  </button>
                </div>
                <p className="text-[8px] text-[#556982] mt-1.5">
                  Direct URLs are fetched into the Web Audio engine with instant waveform scrubbing,
                  pitch controls, and all DSP effects.
                </p>
              </div>

              {/* Direct Audio Presets */}
              <div>
                <div className="flex items-center gap-1.5 text-[9px] text-[#71829a] uppercase tracking-wider mb-2">
                  <Radio className="w-3 h-3 text-[#00f2fe]" />
                  <span>Royalty-Free Audio Stream Presets:</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {DIRECT_AUDIO_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setDirectUrlInput(p.url);
                        handleDirectUrlSubmit(p.url, p.title);
                      }}
                      disabled={isLoadingDirect}
                      className="flex items-center justify-between p-2.5 rounded border border-[#141e2b] bg-[#070b12] text-[#8696ab] hover:border-[#00f2fe]/40 hover:text-white transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-[#00f2fe]" />
                        <div className="text-left">
                          <div className="text-[10px] font-bold text-white">{p.title}</div>
                          <div className="text-[8px] text-[#4f617a] font-mono">{p.genre}</div>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-[#00f2fe] border border-[#00f2fe]/30 px-2 py-0.5 rounded">
                        LOAD
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#141d2a] bg-[#05080d] text-[9px] font-mono text-[#51627c]">
          <span>PULSE FX ENGINE // AUDIO SOURCE ROUTING</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded border border-[#1c293d] hover:border-white text-white transition-colors cursor-pointer"
          >
            RETURN TO DECK
          </button>
        </div>
      </div>
    </div>
  );
};
