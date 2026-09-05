import React, { useEffect, useRef, useState } from 'react';
import { Activity, Gauge, Zap } from 'lucide-react';
import { AudioEngine } from '../audio/AudioEngine';

interface MonitorModuleProps {
  engine: AudioEngine;
  isPlaying: boolean;
  themeAccent: string;
}

export const MonitorModule: React.FC<MonitorModuleProps> = ({
  engine,
  isPlaying,
  themeAccent,
}) => {
  const [bpm, setBpm] = useState(126);
  const [isBeatPulse, setIsBeatPulse] = useState(false);
  const [floorFillWidth, setFloorFillWidth] = useState(0);
  const [miniBarHeights, setMiniBarHeights] = useState<number[]>(new Array(12).fill(15));
  const [peakDb, setPeakDb] = useState(-60);

  const animIdRef = useRef<number | null>(null);
  const beatTimesRef = useRef<number[]>([]);
  const lastBeatTimeRef = useRef(0);

  useEffect(() => {
    const totalBars = 12;
    const freqData = new Uint8Array(256);

    const updateMonitor = () => {
      animIdRef.current = requestAnimationFrame(updateMonitor);

      if (!isPlaying) {
        setFloorFillWidth(0);
        setMiniBarHeights((prev) => prev.map((h) => Math.max(10, h * 0.9)));
        setIsBeatPulse(false);
        setPeakDb(-60);
        return;
      }

      engine.getByteFrequencyData(freqData);

      // 1. Calculate bass average energy
      let bassSum = 0;
      for (let i = 0; i < 8; i++) bassSum += freqData[i];
      const bassAvg = bassSum / 8;

      // 2. Real-time Beat / BPM pulse detector
      const now = performance.now();
      const isKick = bassAvg > 190;

      if (isKick && now - lastBeatTimeRef.current > 260) {
        setIsBeatPulse(true);
        const diff = now - lastBeatTimeRef.current;
        lastBeatTimeRef.current = now;

        if (diff > 300 && diff < 1200) {
          const estimatedBpm = Math.round(60000 / diff);
          beatTimesRef.current.push(estimatedBpm);
          if (beatTimesRef.current.length > 5) beatTimesRef.current.shift();
          const avgBpm = Math.round(
            beatTimesRef.current.reduce((a, b) => a + b, 0) / beatTimesRef.current.length
          );
          setBpm(avgBpm);
        }
      } else if (now - lastBeatTimeRef.current > 120) {
        setIsBeatPulse(false);
      }

      // 3. Floor meter fill width
      const fillPct = Math.min(100, (bassAvg / 255) * 100);
      setFloorFillWidth(fillPct);

      // 4. Calculate 12 spectrum mini-bars
      const newHeights = [];
      for (let i = 0; i < totalBars; i++) {
        const binIndex = Math.floor((i / totalBars) * 128);
        const val = (freqData[binIndex] / 255) * 100;
        newHeights.push(Math.max(12, val));
      }
      setMiniBarHeights(newHeights);

      // 5. RMS & Peak dB
      let sumSquares = 0;
      for (let i = 0; i < 64; i++) {
        const norm = freqData[i] / 255;
        sumSquares += norm * norm;
      }
      const rms = Math.sqrt(sumSquares / 64);
      const calculatedDb = rms > 0.001 ? Math.round(20 * Math.log10(rms)) : -60;
      setPeakDb(calculatedDb);
    };

    updateMonitor();

    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [engine, isPlaying]);

  return (
    <div className="bg-[#06090e] border border-[#111824] rounded p-3 flex flex-col justify-between h-full relative">
      {/* Module Header */}
      <div className="flex items-center justify-between border-b border-[#111824] pb-1.5 mb-2.5">
        <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-[2px] text-[#435269]">
          <Gauge className="w-3 h-3 text-[#ff2a74]" />
          <span>MONITOR // SPECTRUM & VU</span>
        </div>
        <div className="text-[8px] font-mono text-[#51627c]">
          {peakDb > -60 ? `${peakDb} dB` : '-INF'}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 flex-grow justify-around">
        {/* BPM Box & Strobe LEDs */}
        <div className="flex items-center justify-between bg-[#0a0f18] p-2 rounded border border-[#141d2c]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span
                className={`w-3 h-1 rounded-sm transition-all duration-75 ${
                  isBeatPulse
                    ? 'bg-[#ff2a74] shadow-[0_0_8px_#ff2a74] opacity-100'
                    : 'bg-[#ff2a74] opacity-20'
                }`}
              />
              <span
                className={`w-3 h-1 rounded-sm transition-all duration-75 ${
                  isBeatPulse
                    ? 'bg-[#00f2fe] shadow-[0_0_8px_#00f2fe] opacity-100'
                    : 'bg-[#00f2fe] opacity-20'
                }`}
              />
              <span
                className={`w-3 h-1 rounded-sm transition-all duration-75 ${
                  isBeatPulse
                    ? 'bg-[#00ff88] shadow-[0_0_8px_#00ff88] opacity-100'
                    : 'bg-[#00ff88] opacity-20'
                }`}
              />
            </div>
            <span className="text-[9px] font-mono tracking-wider text-[#435269]">TEMPO</span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold font-mono text-white tracking-wider">
              {isPlaying ? bpm : '---'}
            </span>
            <span className="text-[8px] font-mono text-[#51627c]">BPM</span>
          </div>
        </div>

        {/* 12-Band Mini Spectrum Analyzer */}
        <div className="h-16 bg-[#04060a] border border-[#0f1522] p-1.5 rounded flex items-end gap-1">
          {miniBarHeights.map((h, i) => {
            let barColor = '#00f2fe';
            if (i > 8) barColor = '#ff2a74';
            else if (i > 5) barColor = '#ffb700';

            return (
              <div
                key={i}
                className="flex-grow rounded-t-sm transition-all duration-75"
                style={{
                  height: `${h}%`,
                  backgroundColor: barColor,
                  boxShadow: h > 60 ? `0 0 5px ${barColor}` : 'none',
                }}
              />
            );
          })}
        </div>

        {/* Dynamic Floor Meter (Energy VU) */}
        <div>
          <div className="flex justify-between text-[8px] font-mono text-[#435269] mb-1">
            <span>SIGNAL ENERGY</span>
            <span>{Math.round(floorFillWidth)}%</span>
          </div>
          <div className="h-2 bg-[#0f1522] rounded-full overflow-hidden border border-[#162236]">
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${floorFillWidth}%`,
                background: 'linear-gradient(90deg, #00f2fe, #ff007f)',
                boxShadow: floorFillWidth > 70 ? '0 0 10px #ff007f' : 'none',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
