import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from './audio/AudioEngine';
import { StudioHeader } from './components/StudioHeader';
import { VisualizerDisplay } from './components/VisualizerDisplay';
import { NavBar } from './components/NavBar';
import { DeckModule } from './components/DeckModule';
import { MixerModule } from './components/MixerModule';
import { MonitorModule } from './components/MonitorModule';
import { StreamLoaderModal } from './components/StreamLoaderModal';
import { YouTubePlayerDock } from './components/YouTubePlayerDock';
import {
  VisualizerMode,
  ThemeProfile,
  PlaybackStatus,
  TrackMetadata,
  EQSettings,
  FXSettings,
} from './types';

const THEMES: ThemeProfile[] = [
  {
    id: 0,
    name: 'CYAN',
    primary: '#00f2fe',
    secondary: '#4facfe',
    accent: '#00f2fe',
    glow: 'rgba(0, 242, 254, 0.4)',
    bg: '#04060a',
  },
  {
    id: 1,
    name: 'PINK',
    primary: '#ff007f',
    secondary: '#ff758c',
    accent: '#ff007f',
    glow: 'rgba(255, 0, 127, 0.4)',
    bg: '#04060a',
  },
  {
    id: 2,
    name: 'VOLT',
    primary: '#00ff88',
    secondary: '#00a86b',
    accent: '#00ff88',
    glow: 'rgba(0, 255, 136, 0.4)',
    bg: '#04060a',
  },
  {
    id: 3,
    name: 'ACID',
    primary: '#d4fc79',
    secondary: '#96e6a1',
    accent: '#d4fc79',
    glow: 'rgba(212, 252, 121, 0.4)',
    bg: '#04060a',
  },
  {
    id: 4,
    name: 'AMBER',
    primary: '#ff9900',
    secondary: '#ff5500',
    accent: '#ff9900',
    glow: 'rgba(255, 153, 0, 0.4)',
    bg: '#04060a',
  },
  {
    id: 5,
    name: 'PURPLE',
    primary: '#b06eff',
    secondary: '#7a22ff',
    accent: '#b06eff',
    glow: 'rgba(176, 110, 255, 0.4)',
    bg: '#04060a',
  },
];

export default function App() {
  const engineRef = useRef<AudioEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new AudioEngine();
  }
  const engine = engineRef.current;

  // Visualizer & Theme State
  const [currentMode, setCurrentMode] = useState<VisualizerMode>('scope');
  const [themeIdx, setThemeIdx] = useState<number>(0);

  // Playback & Track State
  const [status, setStatus] = useState<PlaybackStatus>('STANDBY');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isTabAudioActive, setIsTabAudioActive] = useState<boolean>(false);
  const [currentYouTubeId, setCurrentYouTubeId] = useState<string | null>(null);
  const [isLoadingYouTubeAudio, setIsLoadingYouTubeAudio] = useState<boolean>(false);
  const [isDirectAudioLoaded, setIsDirectAudioLoaded] = useState<boolean>(false);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [metadata, setMetadata] = useState<TrackMetadata | null>(null);

  // Mixer & DSP FX State
  const [volume, setVolume] = useState<number>(0.8);
  const [eq, setEQ] = useState<EQSettings>({ bass: 0, mid: 0, treble: 0 });
  const [fx, setFX] = useState<FXSettings>({
    reverb: 0,
    delay: 0,
    flange: 0,
    crush: 0,
  });

  const activeTheme = THEMES[themeIdx];

  // Engine callbacks & sync
  useEffect(() => {
    engine.onStatusChange = (newStatus) => {
      setStatus(newStatus as PlaybackStatus);
      setIsPlaying(
        newStatus === 'PLAYING' ||
          newStatus === 'LIVE MIC' ||
          newStatus === 'TAB STREAM'
      );
      setIsTabAudioActive(newStatus === 'TAB STREAM');
    };

    engine.onEnded = () => {
      setIsPlaying(false);
      setStatus('STOPPED');
    };

    // Periodic time tracking ticker
    const interval = setInterval(() => {
      if (engine.getIsPlaying()) {
        setCurrentTime(engine.getCurrentTime());
        setDuration(engine.getDuration());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [engine]);

  // Auto-resume AudioContext on first user interaction so sound is never blocked by browser autoplay policy
  useEffect(() => {
    const unlockAudio = () => {
      try {
        engine.resume().catch(() => {});
      } catch {}
    };
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [engine]);

  // Handle Demo Track launch
  const handleStartDemoBeat = useCallback(() => {
    engine.startSynth('CYBERPUNK');
    setMetadata({
      title: 'NEO-TOKYO SYNTHPULSE (DEMO)',
      format: 'SYNTH 126 BPM',
      duration: 120,
      channels: 2,
      isBuiltInDemo: true,
    });
    setDuration(120);
    setIsPlaying(true);
    setStatus('PLAYING');
  }, [engine]);

  // Handle Play/Pause
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      engine.pause();
      setIsPlaying(false);
      setStatus('PAUSED');
    } else {
      if (currentYouTubeId) {
        setIsPlaying(true);
        setStatus('PLAYING');
        engine.startYouTubeMode(126);
      } else if (!engine.hasAudioBuffer() && !isMicActive && !isTabAudioActive) {
        handleStartDemoBeat();
      } else {
        engine.play();
        setIsPlaying(true);
        setStatus('PLAYING');
      }
    }
  }, [engine, isPlaying, currentYouTubeId, isMicActive, isTabAudioActive, handleStartDemoBeat]);

  // Handle Stop
  const handleStop = useCallback(() => {
    engine.stop();
    setIsPlaying(false);
    setIsTabAudioActive(false);
    setStatus('STOPPED');
    setCurrentTime(0);
  }, [engine]);

  // Handle Cue
  const handleCue = useCallback(() => {
    engine.seek(0);
    setCurrentTime(0);
  }, [engine]);

  // Handle Loop Toggle
  const handleToggleLoop = useCallback(() => {
    const next = !isLooping;
    setIsLooping(next);
    engine.setLoop(next);
  }, [engine, isLooping]);

  // Handle Mute Toggle
  const handleToggleMute = useCallback(() => {
    const muted = engine.toggleMute();
    setIsMuted(muted);
  }, [engine]);

  // Handle Mic Toggle
  const handleToggleMic = useCallback(async () => {
    const active = await engine.toggleMicrophone();
    setIsMicActive(active);
    if (active) {
      setMetadata({
        title: 'LIVE MICROPHONE STREAM',
        format: 'MIC IN',
        duration: 0,
        channels: 1,
      });
      setStatus('LIVE MIC');
      setIsPlaying(true);
    } else {
      setStatus('STOPPED');
      setIsPlaying(false);
    }
  }, [engine]);

  // Handle Tab Audio Capture (Piping YouTube / Tab audio into Web Audio Engine)
  const handleStartTabAudio = useCallback(async () => {
    try {
      const success = await engine.startTabAudioCapture();
      setIsTabAudioActive(success);
      if (success) {
        setStatus('TAB STREAM');
        setIsPlaying(true);
        if (!metadata) {
          setMetadata({
            title: 'CHROME TAB AUDIO STREAM',
            format: 'LIVE STREAM',
            duration: 0,
            channels: 2,
            sourceType: 'youtube',
          });
        }
      }
      return success;
    } catch (err) {
      console.error('Failed to capture tab audio:', err);
      setIsTabAudioActive(false);
      throw err;
    }
  }, [engine, metadata]);

  const handleStopTabAudio = useCallback(() => {
    engine.stopTabAudio();
    setIsTabAudioActive(false);
    if (status === 'TAB STREAM') {
      setStatus('STOPPED');
      setIsPlaying(false);
    }
  }, [engine, status]);

  // Handle YouTube Video Selection
  const handleSelectYouTubeTrack = useCallback(
    async (videoId: string, title: string) => {
      // Stop internal file player or previous synth
      engine.stop();
      setCurrentYouTubeId(videoId);
      setIsLoadingYouTubeAudio(false);
      setIsDirectAudioLoaded(false);
      setIsPlaying(true);
      setStatus('PLAYING (YOUTUBE)');
      engine.startYouTubeMode(126);

      let resolvedTitle = title;
      try {
        const infoRes = await fetch(`/api/youtube-info?id=${videoId}`);
        if (infoRes.ok) {
          const info = await infoRes.json();
          if (info.title) resolvedTitle = info.title;
        }
      } catch {}

      setMetadata({
        title: resolvedTitle,
        format: 'YOUTUBE LIVE',
        duration: 180,
        channels: 2,
        youtubeId: videoId,
        sourceType: 'youtube',
      });
      setDuration(180);
      setCurrentTime(0);
    },
    [engine]
  );

  // Handle Unloading YouTube Video
  const handleCloseYouTube = useCallback(() => {
    setCurrentYouTubeId(null);
    setIsDirectAudioLoaded(false);
    setIsLoadingYouTubeAudio(false);
    engine.stop();
    engine.stopYouTubeMode();
    setIsPlaying(false);
    setStatus('STANDBY');
    setMetadata(null);
  }, [engine]);

  // Handle Direct Web Audio URL stream (.mp3, .wav, .ogg)
  const handleLoadDirectUrl = useCallback(
    async (url: string, title?: string) => {
      try {
        setStatus('DECODING...');
        const meta = await engine.loadAudioFromUrl(url, title);
        setMetadata(meta);
        setDuration(meta.duration);
        setCurrentTime(0);
        setStatus('READY TO MIX');
        engine.play();
        setIsPlaying(true);
        setStatus('PLAYING');
      } catch (err) {
        console.error(err);
        setStatus('STANDBY');
        throw err;
      }
    },
    [engine]
  );

  // Handle File Upload
  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        setStatus('DECODING...');
        const meta = await engine.loadAudioFile(file);
        setMetadata(meta);
        setDuration(meta.duration);
        setCurrentTime(0);
        setStatus('READY TO MIX');
        // Auto play on upload
        engine.play();
        setIsPlaying(true);
        setStatus('PLAYING');
      } catch (err) {
        console.error(err);
        setStatus('STANDBY');
      }
    },
    [engine]
  );

  // Handle Seeking
  const handleSeek = useCallback(
    (seconds: number) => {
      engine.seek(seconds);
      setCurrentTime(seconds);
    },
    [engine]
  );

  // Handle Volume Change
  const handleVolumeChange = useCallback(
    (val: number) => {
      setVolume(val);
      engine.setVolume(val);
    },
    [engine]
  );

  // Handle EQ Change
  const handleEQChange = useCallback(
    (newEq: EQSettings) => {
      setEQ(newEq);
      engine.setEQ(newEq);
    },
    [engine]
  );

  // Handle FX Change
  const handleFXChange = useCallback(
    (newFx: FXSettings) => {
      setFX(newFx);
      engine.setFX(newFx);
    },
    [engine]
  );

  // Handle Playback Rate
  const handlePlaybackRateChange = useCallback(
    (rate: number) => {
      setPlaybackRate(rate);
      engine.setPlaybackRate(rate);
    },
    [engine]
  );

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'KeyL') {
        handleToggleLoop();
      } else if (e.code === 'KeyM') {
        handleToggleMute();
      } else if (e.key >= '1' && e.key <= '6') {
        const modeKeys: VisualizerMode[] = ['bars', 'mirror', 'wave', 'circle', 'scope', 'hexagon'];
        const idx = parseInt(e.key) - 1;
        if (modeKeys[idx]) setCurrentMode(modeKeys[idx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, handleToggleLoop, handleToggleMute]);

  return (
    <div className="flex items-center justify-center min-h-screen p-3 sm:p-5">
      {/* Studio Rack Chassis Box */}
      <main
        id="pulse-studio"
        className="w-full max-w-[960px] bg-[#080b11] border border-[#141b29] rounded-md shadow-[0_30px_80px_rgba(0,0,0,0.85)] p-4 sm:p-5 relative"
      >
        {/* Chassis Hex Mounting Bolts in 4 corners */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#162236] border border-[#2b3a52] flex items-center justify-center pointer-events-none">
          <div className="w-1 h-0.5 bg-[#080b11]" />
        </div>
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#162236] border border-[#2b3a52] flex items-center justify-center pointer-events-none">
          <div className="w-1 h-0.5 bg-[#080b11]" />
        </div>
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#162236] border border-[#2b3a52] flex items-center justify-center pointer-events-none">
          <div className="w-1 h-0.5 bg-[#080b11]" />
        </div>
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#162236] border border-[#2b3a52] flex items-center justify-center pointer-events-none">
          <div className="w-1 h-0.5 bg-[#080b11]" />
        </div>

        {/* 1. Studio Header */}
        <StudioHeader
          status={status}
          sampleRate={engine.getSampleRate()}
          isMicActive={isMicActive}
          isMuted={isMuted}
          onToggleMic={handleToggleMic}
          onToggleMute={handleToggleMute}
          onLoadDemoTrack={handleStartDemoBeat}
          onOpenStreamModal={() => setIsStreamModalOpen(true)}
        />

        {/* 2. Visualizer Display & Interactive Screen */}
        <VisualizerDisplay
          engine={engine}
          mode={currentMode}
          theme={activeTheme}
          isPlaying={isPlaying}
          duration={duration}
          currentTime={currentTime}
          onSeek={handleSeek}
          onStartDemo={handleStartDemoBeat}
          onFileDrop={handleFileUpload}
          statusText={status}
        />

        {/* 2B. Persistent YouTube Live Player Deck */}
        {currentYouTubeId && (
          <YouTubePlayerDock
            videoId={currentYouTubeId}
            videoTitle={metadata?.title || `YOUTUBE // ${currentYouTubeId}`}
            accentColor={activeTheme.primary}
            isTabAudioActive={isTabAudioActive}
            isMicActive={isMicActive}
            isDirectAudioLoaded={isDirectAudioLoaded}
            isLoadingAudio={isLoadingYouTubeAudio}
            volume={volume}
            isMuted={isMuted}
            isPlaying={isPlaying}
            playbackRate={playbackRate}
            onStartTabAudio={handleStartTabAudio}
            onStopTabAudio={handleStopTabAudio}
            onToggleMic={handleToggleMic}
            onClose={handleCloseYouTube}
            onLoadNewVideo={(id, title) => handleSelectYouTubeTrack(id, title)}
          />
        )}

        {/* 3. Navigation Mode & Theme Selector */}
        <NavBar
          currentMode={currentMode}
          themeIdx={themeIdx}
          themes={THEMES}
          onSelectMode={setCurrentMode}
          onSelectTheme={setThemeIdx}
        />

        {/* 4. Bottom Control Rack Grid (Deck, Mixer, Monitor) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 mt-3">
          {/* Deck 01 (cols 1..4) */}
          <div className="md:col-span-4">
            <DeckModule
              metadata={metadata}
              isPlaying={isPlaying}
              isLooping={isLooping}
              currentTime={currentTime}
              duration={duration}
              playbackRate={playbackRate}
              accentColor={activeTheme.primary}
              isTabAudioActive={isTabAudioActive}
              currentYouTubeId={currentYouTubeId}
              onPlayPause={handlePlayPause}
              onStop={handleStop}
              onToggleLoop={handleToggleLoop}
              onCue={handleCue}
              onPlaybackRateChange={handlePlaybackRateChange}
              onFileUpload={handleFileUpload}
              onOpenStreamModal={() => setIsStreamModalOpen(true)}
            />
          </div>

          {/* Mixer & DSP FX (cols 5..9) */}
          <div className="md:col-span-5">
            <MixerModule
              volume={volume}
              eq={eq}
              fx={fx}
              themeAccent={activeTheme.primary}
              onVolumeChange={handleVolumeChange}
              onEQChange={handleEQChange}
              onFXChange={handleFXChange}
            />
          </div>

          {/* Monitor & VU Telemetry (cols 10..12) */}
          <div className="md:col-span-3">
            <MonitorModule
              engine={engine}
              isPlaying={isPlaying}
              themeAccent={activeTheme.primary}
            />
          </div>
        </div>

        {/* 5. YouTube & Web Audio Stream Modal */}
        <StreamLoaderModal
          isOpen={isStreamModalOpen}
          onClose={() => setIsStreamModalOpen(false)}
          accentColor={activeTheme.primary}
          isTabAudioActive={isTabAudioActive}
          isMicActive={isMicActive}
          onStartTabAudio={handleStartTabAudio}
          onStopTabAudio={handleStopTabAudio}
          onToggleMic={handleToggleMic}
          onLoadDirectUrl={handleLoadDirectUrl}
          onSelectYouTubeTrack={handleSelectYouTubeTrack}
          currentYouTubeId={currentYouTubeId}
        />
      </main>
    </div>
  );
}
