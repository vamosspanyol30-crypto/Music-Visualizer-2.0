import React, { useRef, useState, useCallback, useEffect } from 'react';

interface RotaryKnobProps {
  label: string;
  value: number; // 0 to 1
  min?: number;
  max?: number;
  step?: number;
  accentColor?: string;
  onChange: (value: number) => void;
  onReset?: () => void;
  unit?: string;
}

export const RotaryKnob: React.FC<RotaryKnobProps> = ({
  label,
  value,
  min = 0,
  max = 1,
  accentColor = '#00f2fe',
  onChange,
  onReset,
  unit = '%',
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartValue = useRef(0);

  // Convert 0..1 value to -135deg .. +135deg (270 degree rotation range)
  const normalized = (value - min) / (max - min);
  const angle = -135 + normalized * 270;

  // Arc math for SVG ring
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  // We only show 270 degrees of the circle (0.75 of circumference)
  const totalArc = circumference * 0.75;
  const strokeDashoffset = totalArc - normalized * totalArc;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartValue.current = value;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = dragStartY.current - moveEvent.clientY;
      const sensitivity = 0.005; // 200px drag = 100%
      const rawNew = dragStartValue.current + deltaY * sensitivity * (max - min);
      const clamped = Math.min(max, Math.max(min, rawNew));
      onChange(Number(clamped.toFixed(3)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const rawNew = value + delta * (max - min);
    const clamped = Math.min(max, Math.max(min, rawNew));
    onChange(Number(clamped.toFixed(3)));
  };

  const handleDoubleClick = () => {
    if (onReset) {
      onReset();
    } else {
      onChange(min);
    }
  };

  const displayPercent = Math.round(normalized * 100);

  return (
    <div
      className="flex flex-col items-center gap-1.5 group select-none"
      onWheel={handleWheel}
      title={`${label}: ${displayPercent}${unit} (Drag up/down or scroll. Double-click to reset)`}
    >
      <div className="relative w-11 h-11 flex items-center justify-center">
        {/* SVG Dial Arc Background & Active Meter */}
        <svg className="w-11 h-11 absolute inset-0 -rotate-[225deg] pointer-events-none">
          {/* Background Track Arc */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="#162236"
            strokeWidth="3"
            strokeDasharray={`${totalArc} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Active Accent Arc */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke={accentColor}
            strokeWidth="3.2"
            strokeDasharray={`${totalArc} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              filter: isDragging || value > 0 ? `drop-shadow(0 0 5px ${accentColor})` : 'none',
              transition: isDragging ? 'none' : 'stroke-dashoffset 0.1s ease',
            }}
          />
        </svg>

        {/* Knob Body */}
        <div
          ref={knobRef}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          className={`w-7 h-7 rounded-full bg-gradient-to-b from-[#1c2738] to-[#0c121d] border border-[#2b3a52] cursor-ns-resize shadow-md flex items-center justify-center transition-transform active:scale-95 ${
            isDragging ? 'ring-1 ring-[#00f2fe]' : 'hover:border-[#42597a]'
          }`}
          style={{
            transform: `rotate(${angle}deg)`,
            boxShadow: value > 0.05 ? `0 0 8px ${accentColor}33` : '0 2px 5px rgba(0,0,0,0.5)',
          }}
        >
          {/* Notch indicator pointing at angle */}
          <div
            className="w-0.5 h-2.5 rounded-full absolute top-0.5"
            style={{
              backgroundColor: value > 0 ? accentColor : '#64748b',
              boxShadow: value > 0 ? `0 0 6px ${accentColor}` : 'none',
            }}
          />
        </div>
      </div>

      {/* Label and Value Badge */}
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-bold tracking-widest text-[#5d6f8a] uppercase group-hover:text-white transition-colors">
          {label}
        </span>
        <span
          className="text-[9px] font-mono transition-colors"
          style={{ color: value > 0 ? accentColor : '#3e4d63' }}
        >
          {displayPercent}{unit}
        </span>
      </div>
    </div>
  );
};
