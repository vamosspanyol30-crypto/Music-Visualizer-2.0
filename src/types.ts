export type VisualizerMode = 'bars' | 'mirror' | 'wave' | 'circle' | 'scope' | 'hexagon';

export interface ThemeProfile {
  id: number;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  bg: string;
}

export type PlaybackStatus =
  | 'STANDBY'
  | 'DECODING...'
  | 'READY TO MIX'
  | 'PLAYING'
  | 'PAUSED'
  | 'STOPPED'
  | 'LIVE MIC'
  | 'TAB STREAM';

export interface FXSettings {
  reverb: number; // 0 to 1
  delay: number;  // 0 to 1
  flange: number; // 0 to 1
  crush: number;  // 0 to 1
}

export interface EQSettings {
  bass: number;   // -20 to +20 dB
  mid: number;    // -20 to +20 dB
  treble: number; // -20 to +20 dB
}

export interface TrackMetadata {
  title: string;
  artist?: string;
  format?: string;
  duration: number; // seconds
  sampleRate?: number;
  channels?: number;
  isBuiltInDemo?: boolean;
  youtubeId?: string;
  sourceType?: 'file' | 'synth' | 'mic' | 'youtube' | 'url';
}

export interface AudioTelemetry {
  bpm: number;
  bassEnergy: number; // 0 - 255
  midEnergy: number;
  trebleEnergy: number;
  rmsLevel: number;   // 0 - 1
  peakDb: number;
}
