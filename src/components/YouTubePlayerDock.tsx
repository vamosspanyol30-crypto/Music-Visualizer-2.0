import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Youtube,
  Share2,
  Mic,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Sliders,
  CheckCircle2,
  Radio,
  Zap,
} from 'lucide-react';
import { extractYouTubeId } from './StreamLoaderModal';

interface YouTubePlayerDockProps {
  videoId: string;
  videoTitle: string;
  accentColor: string;
  isTabAudioActive: boolean;
  isMicActive: boolean;
  isDirectAudioLoaded?: boolean;
  isLoadingAudio?: boolean;
  volume?: number;
  isMuted?: boolean;
  isPlaying?: boolean;
  playbackRate?: number;
  onStartTabAudio: () => Promise<boolean>;
  onStopTabAudio: () => void;
  onToggleMic: () => Promise<void>;
  onClose: () => void;
  onLoadNewVideo: (videoId: string, title: string) => void;
}

export const YouTubePlayerDock: React.FC<YouTubePlayerDockProps> = ({
  videoId,
  videoTitle,
  accentColor,
  isTabAudioActive,
  isMicActive,
  isDirectAudioLoaded = false,
  isLoadingAudio = false,
  volume = 0.8,
  isMuted = false,
  isPlaying = true,
  playbackRate = 1.0,
  onStartTabAudio,
  onStopTabAudio,
  onToggleMic,
  onClose,
  onLoadNewVideo,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [quickInput, setQuickInput] = useState('');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  
  // NEVER default to muted! Always play audio directly!
  const [muteVideoIframe, setMuteVideoIframe] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Send postMessage commands to the YouTube iframe API
  const sendIframeCommand = useCallback((func: string, args: any[] = []) => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      }
    } catch (e) {
      console.warn('Iframe postMessage err:', e);
    }
  }, []);

  // Force Unmute & Set Max Volume immediately
  const handleForceUnmute = useCallback(() => {
    setMuteVideoIframe(false);
    sendIframeCommand('unMute');
    sendIframeCommand('setVolume', [100]);
    sendIframeCommand('playVideo');
    setStatusFeedback('🔊 Sound unmuted! YouTube volume set to 100%.');
    setTimeout(() => setStatusFeedback(null), 4000);
  }, [sendIframeCommand]);

  // Sync mixer volume changes to YouTube
  useEffect(() => {
    sendIframeCommand('setVolume', [Math.round(volume * 100)]);
  }, [volume, sendIframeCommand]);

  // Sync mute changes to YouTube (auto-mute iframe when tab audio capture is active so user only hears EQ-filtered audio)
  useEffect(() => {
    if (isMuted || isTabAudioActive) {
      sendIframeCommand('mute');
    } else {
      sendIframeCommand('unMute');
    }
  }, [isMuted, isTabAudioActive, sendIframeCommand]);

  // Sync Play / Pause changes to YouTube
  useEffect(() => {
    if (isPlaying) {
      sendIframeCommand('playVideo');
    } else {
      sendIframeCommand('pauseVideo');
    }
  }, [isPlaying, sendIframeCommand]);

  // Sync playback rate changes to YouTube
  useEffect(() => {
    sendIframeCommand('setPlaybackRate', [playbackRate]);
  }, [playbackRate, sendIframeCommand]);

  // When iframe loads, trigger unMute and volume sync
  const handleIframeLoad = () => {
    setTimeout(() => {
      sendIframeCommand('unMute');
      sendIframeCommand('setVolume', [Math.round(volume * 100)]);
      sendIframeCommand('playVideo');
    }, 1200);
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    const newId = extractYouTubeId(quickInput.trim());
    if (newId) {
      onLoadNewVideo(newId, `YOUTUBE // ${newId}`);
      setQuickInput('');
      setStatusFeedback('Loading new YouTube stream...');
      setTimeout(() => setStatusFeedback(null), 3000);
    } else {
      setStatusFeedback('Invalid YouTube URL or ID');
      setTimeout(() => setStatusFeedback(null), 3000);
    }
  };

  const handleTabCapture = async () => {
    try {
      if (isTabAudioActive) {
        onStopTabAudio();
        setStatusFeedback('Tab audio disconnected.');
      } else {
        const success = await onStartTabAudio();
        if (success) {
          setStatusFeedback('⚡ Bit-perfect Tab Audio connected to Bass, Mid, Treble & FX Rack!');
        }
      }
    } catch (err: any) {
      setStatusFeedback(err?.message || 'Capture canceled or unavailable.');
    }
    setTimeout(() => setStatusFeedback(null), 5000);
  };

  return (
    <div
      id="youtube-player-dock"
      className="my-3 w-full bg-[#05080e] border border-[#1b2738] rounded-md overflow-hidden shadow-2xl transition-all"
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#080d16] border-b border-[#141e2e] gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#ff0033]/15 border border-[#ff0033]/40 text-[#ff0033] text-[10px] font-mono font-bold tracking-wider">
            <Youtube className="w-3.5 h-3.5" />
            <span>YOUTUBE LIVE DECK</span>
          </div>
          <span className="text-[10px] font-mono text-white font-bold truncate max-w-[200px] sm:max-w-[320px]" title={videoTitle}>
            {videoTitle}
          </span>
        </div>

        {/* Sync Mode Status Badge */}
        <div className="flex items-center gap-2">
          {isTabAudioActive ? (
            <span className="text-[8px] font-mono px-2 py-0.5 rounded-full border border-[#00ff88]/40 bg-[#00ff88]/15 text-[#00ff88] flex items-center gap-1 font-bold shadow-[0_0_8px_rgba(0,255,136,0.3)] animate-pulse">
              <Zap className="w-2.5 h-2.5" />
              <span>TAB AUDIO WIRED TO EQ & FX</span>
            </span>
          ) : isDirectAudioLoaded ? (
            <span className="text-[8px] font-mono px-2 py-0.5 rounded-full border border-[#00ff88]/40 bg-[#00ff88]/15 text-[#00ff88] flex items-center gap-1 font-bold shadow-[0_0_8px_rgba(0,255,136,0.3)]">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>DECK BUFFER ACTIVE</span>
            </span>
          ) : isMicActive ? (
            <span className="text-[8px] font-mono px-2 py-0.5 rounded-full border border-[#ffb700]/40 bg-[#ffb700]/15 text-[#ffb700] flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span>MIC AUDIO LISTEN</span>
            </span>
          ) : (
            <span className="text-[8px] font-mono px-2 py-0.5 rounded-full border border-[#00f2fe]/40 bg-[#00f2fe]/10 text-[#00f2fe] flex items-center gap-1 font-bold">
              <Radio className="w-2.5 h-2.5" />
              <span>LIVE AUDIO FEED</span>
            </span>
          )}

          {/* Minimize / Expand Toggle */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-[#64748b] hover:text-white rounded hover:bg-[#141e2e] transition-colors cursor-pointer"
            title={isMinimized ? 'Expand Video Player' : 'Minimize Player'}
          >
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          {/* Close / Unload Button */}
          <button
            onClick={onClose}
            className="p-1 text-[#64748b] hover:text-[#ff3355] rounded hover:bg-[#141e2e] transition-colors cursor-pointer"
            title="Unload YouTube Deck"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content Area */}
      {!isMinimized && (
        <div className="p-3 space-y-3 bg-[#04060a]">
          {/* Direct Sound Unmute Alert Bar - Prominent Neon Action */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-[#0a121e] border border-[#1b2b40]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff88]"></span>
              </span>
              <span className="text-[10px] font-mono text-white font-bold">
                AUDIO CONTROL:
              </span>
              <span className="text-[9px] font-mono text-[#8696ab] hidden sm:inline">
                Click below if your browser blocked audio autoplay
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Giant Unmute & Max Volume Button */}
              <button
                id="btn-force-unmute"
                onClick={handleForceUnmute}
                className="flex items-center gap-1.5 py-1 px-3 rounded bg-[#00ff88] hover:bg-[#33ff99] text-black font-mono font-bold text-[9px] tracking-wider shadow-[0_0_12px_rgba(0,255,136,0.3)] uppercase transition-all cursor-pointer"
                title="Force YouTube audio to play at 100% volume"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>🔊 UNMUTE & PLAY SOUND (100% VOL)</span>
              </button>

              {/* Tab Audio Capture Option */}
              <button
                id="btn-tab-capture"
                onClick={handleTabCapture}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded text-[9px] font-mono font-bold tracking-wider transition-all cursor-pointer ${
                  isTabAudioActive
                    ? 'bg-[#ff2a74]/20 border border-[#ff2a74] text-[#ff2a74] hover:bg-[#ff2a74]/30 shadow-[0_0_10px_rgba(255,42,116,0.3)]'
                    : 'bg-[#1b2738] text-white hover:bg-[#25364d] border border-[#2b3e58]'
                }`}
                title="Route live YouTube audio through BASS, MID, TREBLE and FX chain"
              >
                <Zap className="w-3 h-3 text-[#00f2fe]" />
                <span>{isTabAudioActive ? 'STOP TAB AUDIO' : '⚡ CAPTURE TAB AUDIO (WIRES EQ & FX)'}</span>
              </button>

              {/* Mic Sync Option */}
              <button
                onClick={onToggleMic}
                className={`flex items-center gap-1 py-1 px-2 rounded border text-[9px] font-mono transition-all cursor-pointer ${
                  isMicActive
                    ? 'border-[#ffb700] text-[#ffb700] bg-[#ffb700]/10'
                    : 'border-[#1b2738] text-[#8696ab] hover:border-white hover:text-white'
                }`}
                title="Listen through laptop/desktop microphone"
              >
                <Mic className="w-3 h-3" />
                <span>{isMicActive ? 'STOP MIC' : 'MIC'}</span>
              </button>
            </div>
          </div>

          {/* Feedback banner */}
          {statusFeedback && (
            <div className="p-1.5 px-2.5 rounded bg-[#00f2fe]/10 border border-[#00f2fe]/40 text-[#00f2fe] text-[9px] font-mono flex items-center gap-2 animate-fadeIn">
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>{statusFeedback}</span>
            </div>
          )}

          {/* Embedded Video + Quick URL Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* 16:9 Embedded YouTube Video Frame */}
            <div className="md:col-span-8 relative aspect-video w-full rounded border border-[#1b2738] overflow-hidden bg-black shadow-inner">
              <iframe
                ref={iframeRef}
                id="youtube-active-iframe"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${muteVideoIframe ? 1 : 0}&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                title="YouTube Video Player"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onLoad={handleIframeLoad}
              />
            </div>

            {/* Side Controls & Quick Paste Panel */}
            <div className="md:col-span-4 flex flex-col justify-between space-y-2 h-full">
              <div className="space-y-2">
                <div className="text-[9px] font-mono text-[#71829a] uppercase tracking-wider">
                  Switch YouTube Track:
                </div>
                <form onSubmit={handleQuickSubmit} className="flex flex-col gap-1.5">
                  <input
                    type="text"
                    placeholder="Paste YouTube link or ID..."
                    value={quickInput}
                    onChange={(e) => setQuickInput(e.target.value)}
                    className="w-full bg-[#080d16] border border-[#162234] rounded px-2.5 py-1.5 text-white text-[10px] font-mono focus:outline-none focus:border-[#ff0033]"
                  />
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 bg-[#ff0033] hover:bg-[#cc0029] text-white py-1.5 px-3 rounded text-[9px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>LOAD VIDEO</span>
                  </button>
                </form>
              </div>

              {/* Hardware DJ Tips */}
              <div className="p-2.5 rounded bg-[#090e17] border border-[#141e2e] text-[8px] font-mono text-[#71829a] space-y-1.5">
                <div className="text-[#00ff88] font-bold flex items-center gap-1">
                  <Sliders className="w-3 h-3" />
                  <span>DJ CONTROLLER WIRED:</span>
                </div>
                <div>• <span className="text-white font-bold">VOL SLIDER</span>: Directly controls YouTube song volume</div>
                <div>• <span className="text-white font-bold">PLAY / PAUSE</span>: Starts & pauses YouTube playback</div>
                <div>• <span className="text-white font-bold">CUE BUTTON</span>: Jumps YouTube playback to 0:00</div>
                <div>• <span className="text-white font-bold">PITCH FADER</span>: Alters YouTube tempo (0.5x – 2.0x)</div>
                <div className="text-[#00f2fe] pt-1 border-t border-[#141e2e]">
                  💡 Click <span className="font-bold">CAPTURE TAB AUDIO</span> above to route through the live Bass, Mid, Treble, and FX Rack!
                </div>
              </div>

              {/* Info & Outbound Link */}
              <div className="pt-2 border-t border-[#141e2e] flex items-center justify-between text-[8px] font-mono text-[#51627c]">
                <span>ID: {videoId}</span>
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#00f2fe] hover:underline flex items-center gap-1"
                >
                  <span>Open in YouTube</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
