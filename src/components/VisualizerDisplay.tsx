import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Maximize2, Minimize2, Sliders, Volume2, Sparkles } from 'lucide-react';
import { VisualizerMode, ThemeProfile } from '../types';
import { AudioEngine } from '../audio/AudioEngine';

interface VisualizerDisplayProps {
  engine: AudioEngine;
  mode: VisualizerMode;
  theme: ThemeProfile;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  onSeek: (seconds: number) => void;
  onStartDemo: () => void;
  onFileDrop: (file: File) => void;
  statusText: string;
}

class Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.radius = Math.random() * 2.5 + 1.2;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 1.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.color = color;
    this.alpha = 1;
    this.life = 1.0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.alpha -= 0.025;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}

export const VisualizerDisplay: React.FC<VisualizerDisplayProps> = ({
  engine,
  mode,
  theme,
  isPlaying,
  duration,
  currentTime,
  onSeek,
  onStartDemo,
  onFileDrop,
  statusText,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sensitivity, setSensitivity] = useState(1.0);
  const [showControls, setShowControls] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Peak caps array for bar modes
  const peaksRef = useRef<number[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Drag & drop file handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      onFileDrop(file);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Format time (00:00)
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Canvas render animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bufferLength = 256;
    let freqData = new Uint8Array(bufferLength);
    let timeData = new Uint8Array(bufferLength);

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(canvas);
    resizeCanvas();

    let rotationAngle = 0;

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      if (bufferLength !== engine.getFrequencyBinCount()) {
        bufferLength = engine.getFrequencyBinCount();
        freqData = new Uint8Array(bufferLength);
        timeData = new Uint8Array(bufferLength);
        peaksRef.current = new Array(bufferLength).fill(0);
      }

      if (isPlaying) {
        engine.getByteFrequencyData(freqData);
        engine.getByteTimeDomainData(timeData);
      } else {
        freqData.fill(0);
        timeData.fill(128);
      }

      // 1. Trail Clear Screen
      ctx.fillStyle = 'rgba(4, 6, 10, 0.25)';
      ctx.fillRect(0, 0, width, height);

      // 2. Cyberpunk subtle grid backdrop
      ctx.strokeStyle = 'rgba(18, 26, 42, 0.4)';
      ctx.lineWidth = 1;
      const gridSpacing = 30;
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3. Bass Kick Detector for Particle Burst
      let bassSum = 0;
      for (let i = 0; i < 8; i++) bassSum += freqData[i];
      const bassAvg = bassSum / 8;

      if (isPlaying && bassAvg > 195) {
        if (particlesRef.current.length < 35) {
          const spawnX = width / 2 + (Math.random() - 0.5) * (width * 0.5);
          const spawnY = height / 2 + (Math.random() - 0.5) * (height * 0.4);
          particlesRef.current.push(new Particle(spawnX, spawnY, theme.primary));
          particlesRef.current.push(new Particle(spawnX, spawnY, theme.secondary));
        }
      }

      // Update & draw particles
      particlesRef.current.forEach((p, idx) => {
        p.update();
        p.draw(ctx);
        if (p.alpha <= 0) particlesRef.current.splice(idx, 1);
      });

      // 4. Render Visualizer Modes
      const primary = theme.primary;
      const secondary = theme.secondary;

      if (mode === 'bars') {
        const numBars = Math.min(64, bufferLength);
        const barWidth = (width / numBars) * 0.85;
        const gap = (width / numBars) * 0.15;

        for (let i = 0; i < numBars; i++) {
          const dataIdx = Math.floor((i / numBars) * (bufferLength * 0.75));
          const val = (freqData[dataIdx] / 255) * sensitivity;
          const barHeight = Math.max(3, val * height * 0.82);
          const x = i * (barWidth + gap) + gap / 2;
          const y = height - barHeight;

          // Peak falloff
          if (!peaksRef.current[i]) peaksRef.current[i] = 0;
          if (barHeight > peaksRef.current[i]) {
            peaksRef.current[i] = barHeight;
          } else {
            peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 1.8);
          }

          // Gradient bar fill
          const grad = ctx.createLinearGradient(0, height, 0, y);
          grad.addColorStop(0, primary);
          grad.addColorStop(1, secondary);

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Glowing peak cap
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, height - peaksRef.current[i] - 3, barWidth, 2);
        }
      } else if (mode === 'mirror') {
        const numBars = Math.min(48, bufferLength);
        const barWidth = (width / numBars) * 0.8;
        const gap = (width / numBars) * 0.2;
        const centerY = height / 2;

        for (let i = 0; i < numBars; i++) {
          const dataIdx = Math.floor((i / numBars) * (bufferLength * 0.65));
          const val = (freqData[dataIdx] / 255) * sensitivity;
          const barHeight = Math.max(2, val * (height * 0.42));
          const x = i * (barWidth + gap);

          const grad = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
          grad.addColorStop(0, secondary);
          grad.addColorStop(0.5, primary);
          grad.addColorStop(1, secondary);

          ctx.fillStyle = grad;
          // Top half
          ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
          // Bottom half
          ctx.fillRect(x, centerY, barWidth, barHeight);
        }
      } else if (mode === 'wave') {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = primary;
        ctx.shadowBlur = 12;
        ctx.shadowColor = primary;

        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = (timeData[i] / 128.0 - 1.0) * sensitivity + 1.0;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (mode === 'circle') {
        const cx = width / 2;
        const cy = height / 2;
        const baseRadius = Math.min(cx, cy) * 0.45;
        rotationAngle += 0.005;

        // Inner glowing core
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = primary;
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 0.6 + (bassAvg / 255) * 15, 0, Math.PI * 2);
        ctx.strokeStyle = secondary;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        const numRays = 72;
        for (let i = 0; i < numRays; i++) {
          const dataIdx = Math.floor((i / numRays) * (bufferLength * 0.7));
          const amp = (freqData[dataIdx] / 255) * sensitivity * (height * 0.35);
          const angle = (i / numRays) * Math.PI * 2 + rotationAngle;

          const x1 = cx + Math.cos(angle) * baseRadius;
          const y1 = cy + Math.sin(angle) * baseRadius;
          const x2 = cx + Math.cos(angle) * (baseRadius + amp);
          const y2 = cy + Math.sin(angle) * (baseRadius + amp);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = i % 2 === 0 ? primary : secondary;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      } else if (mode === 'scope') {
        // Dual Neon Scope Waveform
        const sliceWidth = width / bufferLength;

        // Primary Beam (Top Shifted)
        ctx.shadowBlur = 16;
        ctx.shadowColor = primary;
        ctx.strokeStyle = primary;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = (timeData[i] / 128.0 - 1.0) * sensitivity + 1.0;
          const y = (v * height) / 2 - 16;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();

        // Secondary Beam (Bottom Shifted)
        ctx.shadowColor = secondary;
        ctx.strokeStyle = secondary;
        ctx.beginPath();
        x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = (timeData[i] / 128.0 - 1.0) * sensitivity + 1.0;
          const y = (v * height) / 2 + 16;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (mode === 'hexagon') {
        // Cyberpunk reactive geometric tunnel
        const cx = width / 2;
        const cy = height / 2;
        const sides = 6;
        rotationAngle += 0.008;

        const rings = 5;
        for (let r = 1; r <= rings; r++) {
          const dataIdx = (r * 12) % bufferLength;
          const amp = (freqData[dataIdx] / 255) * sensitivity;
          const radius = r * 28 + amp * 30;

          ctx.save();
          ctx.strokeStyle = r % 2 === 0 ? primary : secondary;
          ctx.lineWidth = 1.8;
          ctx.shadowBlur = amp > 0.5 ? 12 : 4;
          ctx.shadowColor = primary;

          ctx.beginPath();
          for (let s = 0; s <= sides; s++) {
            const angle = (s / sides) * Math.PI * 2 + rotationAngle * (r % 2 === 0 ? 1 : -1);
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.restore();
        }
      }
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
    };
  }, [engine, mode, theme, isPlaying, sensitivity]);

  // Handle timeline scrubber click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full rounded border border-[#141c2c] bg-[#04060a] overflow-hidden transition-all group ${
        isDragOver ? 'ring-2 ring-[#00ff88] border-[#00ff88]' : ''
      } ${isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[280px]'}`}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Empty State / Hint Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 select-none">
          <div className="text-center max-w-sm pointer-events-auto">
            <p className="text-[11px] font-mono tracking-[3px] text-[#00f2fe]/60 mb-2 font-bold uppercase">
              {statusText === 'STANDBY' ? 'UPLOAD A TRACK TO INITIALIZE DECK' : statusText}
            </p>
            <p className="text-[9px] text-[#51627c] tracking-widest mb-4">
              DRAG & DROP AUDIO FILE, STREAM YOUTUBE, OR LAUNCH SYNTH
            </p>
            <button
              onClick={onStartDemo}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#00f2fe]/10 border border-[#00f2fe]/50 text-[#00f2fe] text-xs font-bold tracking-wider hover:bg-[#00f2fe]/20 hover:shadow-[0_0_15px_rgba(0,242,254,0.4)] transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>START SYNTH DEMO BEAT</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Canvas Controls (Top-Right) */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setShowControls(!showControls)}
          className={`p-1.5 rounded border transition-all text-xs cursor-pointer ${
            showControls
              ? 'bg-[#00f2fe]/20 border-[#00f2fe] text-[#00f2fe]'
              : 'bg-[#080b11]/80 border-[#162236] text-[#72829c] hover:text-white'
          }`}
          title="Visualizer Sensitivity"
        >
          <Sliders className="w-3 h-3" />
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded border bg-[#080b11]/80 border-[#162236] text-[#72829c] hover:text-[#00f2fe] hover:border-[#00f2fe]/40 transition-all text-xs cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Visualizer'}
        >
          {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </button>
      </div>

      {/* Sensitivity Slider Popover */}
      {showControls && (
        <div className="absolute top-10 right-2 p-2.5 rounded bg-[#080b11]/95 border border-[#162236] shadow-xl flex items-center gap-2 z-10 animate-in fade-in">
          <span className="text-[9px] font-mono text-[#51627c]">GAIN:</span>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            className="w-20 accent-[#00f2fe] cursor-pointer"
          />
          <span className="text-[9px] font-mono text-[#00f2fe] w-8">
            {sensitivity.toFixed(1)}x
          </span>
        </div>
      )}

      {/* Interactive Timeline Scrubber (Bottom Bar) */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#04060a]/90 to-transparent pt-3 pb-1 px-3 flex flex-col gap-1">
        <div
          onClick={handleTimelineClick}
          className="relative h-2 w-full bg-[#101622] rounded-full cursor-pointer hover:h-2.5 transition-all overflow-hidden border border-[#162236]"
          title="Click to seek"
        >
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
              boxShadow: `0 0 8px ${theme.primary}`,
            }}
          />
        </div>

        <div className="flex justify-between items-center text-[9px] font-mono text-[#435269]">
          <span>{formatTime(currentTime)}</span>
          <span className="tracking-widest uppercase text-[8px]">
            {mode.toUpperCase()} SCOPE // {theme.name}
          </span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};
