import { EQSettings, FXSettings, TrackMetadata } from '../types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;

  // 3-band EQ
  private bassFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;

  // DSP FX Nodes
  // 1. Reverb
  private reverbConvolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private reverbDryGain: GainNode | null = null;

  // 2. Delay
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayFilterNode: BiquadFilterNode | null = null;
  private delayWetGain: GainNode | null = null;
  private delayDryGain: GainNode | null = null;

  // 3. Flanger
  private flangerDelayNode: DelayNode | null = null;
  private flangerLfo: OscillatorNode | null = null;
  private flangerLfoGain: GainNode | null = null;
  private flangerFeedback: GainNode | null = null;
  private flangerWetGain: GainNode | null = null;
  private flangerDryGain: GainNode | null = null;

  // 4. Bitcrusher / Overdrive
  private waveShaper: WaveShaperNode | null = null;
  private crushWetGain: GainNode | null = null;
  private crushDryGain: GainNode | null = null;

  // Source & Playback State
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private streamAudioEl: HTMLAudioElement | null = null;
  private streamSourceNode: MediaElementAudioSourceNode | null = null;
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private tabStream: MediaStream | null = null;
  private tabSourceNode: MediaStreamAudioSourceNode | null = null;

  private isPlaying = false;
  private isPaused = false;
  private startTime = 0;
  private pausedAt = 0;
  private playbackRate = 1.0;
  private loop = false;
  private isMuted = false;
  private cachedVolume = 0.8;

  // Built-in Synth Beat Sequencer
  private isSynthRunning = false;
  private synthStep = 0;
  private synthTimerId: number | null = null;
  private synthBpm = 126;

  // YouTube Mode & Reactive Beat Synthesizer
  private isYouTubeMode = false;
  private youtubeStartTime = 0;
  private youtubeBpm = 126;
  private currentEQ: EQSettings = { bass: 0, mid: 0, treble: 0 };

  // Callbacks
  public onEnded?: () => void;
  public onStatusChange?: (status: string) => void;

  constructor() {
    // Lazy initialized on first user interaction
  }

  public init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // 1. Analyser
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.82;

    // 2. Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.cachedVolume, this.ctx.currentTime);

    // 3. EQ Filters (Tuned for high-precision DJ mixer sculpting)
    this.bassFilter = this.ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
    this.bassFilter.gain.setValueAtTime(this.currentEQ.bass, this.ctx.currentTime);

    this.midFilter = this.ctx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
    this.midFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);
    this.midFilter.gain.setValueAtTime(this.currentEQ.mid, this.ctx.currentTime);

    this.trebleFilter = this.ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.setValueAtTime(3200, this.ctx.currentTime);
    this.trebleFilter.gain.setValueAtTime(this.currentEQ.treble, this.ctx.currentTime);

    // 4. DSP Effects Setup
    // REVERB
    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = this.generateImpulseResponse(this.ctx, 2.2, 2.0);
    this.reverbWetGain = this.ctx.createGain();
    this.reverbWetGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.reverbDryGain = this.ctx.createGain();
    this.reverbDryGain.gain.setValueAtTime(1, this.ctx.currentTime);

    // DELAY
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.setValueAtTime(0.35, this.ctx.currentTime);
    this.delayFeedbackGain = this.ctx.createGain();
    this.delayFeedbackGain.gain.setValueAtTime(0.42, this.ctx.currentTime);
    this.delayFilterNode = this.ctx.createBiquadFilter();
    this.delayFilterNode.type = 'lowpass';
    this.delayFilterNode.frequency.setValueAtTime(2500, this.ctx.currentTime);

    this.delayWetGain = this.ctx.createGain();
    this.delayWetGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.delayDryGain = this.ctx.createGain();
    this.delayDryGain.gain.setValueAtTime(1, this.ctx.currentTime);

    // Wire Delay Loop
    this.delayNode.connect(this.delayFilterNode);
    this.delayFilterNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);
    this.delayFilterNode.connect(this.delayWetGain);

    // FLANGER
    this.flangerDelayNode = this.ctx.createDelay(0.05);
    this.flangerDelayNode.delayTime.setValueAtTime(0.0035, this.ctx.currentTime);
    this.flangerFeedback = this.ctx.createGain();
    this.flangerFeedback.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.flangerLfo = this.ctx.createOscillator();
    this.flangerLfo.frequency.setValueAtTime(0.8, this.ctx.currentTime);
    this.flangerLfoGain = this.ctx.createGain();
    this.flangerLfoGain.gain.setValueAtTime(0.002, this.ctx.currentTime);

    this.flangerLfo.connect(this.flangerLfoGain);
    this.flangerLfoGain.connect(this.flangerDelayNode.delayTime);
    this.flangerDelayNode.connect(this.flangerFeedback);
    this.flangerFeedback.connect(this.flangerDelayNode);
    this.flangerLfo.start();

    this.flangerWetGain = this.ctx.createGain();
    this.flangerWetGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.flangerDryGain = this.ctx.createGain();
    this.flangerDryGain.gain.setValueAtTime(1, this.ctx.currentTime);
    this.flangerDelayNode.connect(this.flangerWetGain);

    // CRUSH / DISTORTION
    this.waveShaper = this.ctx.createWaveShaper();
    this.waveShaper.curve = this.makeDistortionCurve(0);
    this.waveShaper.oversample = '4x';
    this.crushWetGain = this.ctx.createGain();
    this.crushWetGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.crushDryGain = this.ctx.createGain();
    this.crushDryGain.gain.setValueAtTime(1, this.ctx.currentTime);
    this.waveShaper.connect(this.crushWetGain);

    // Connect DSP Chain:
    // Bass -> Mid -> Treble
    this.bassFilter.connect(this.midFilter);
    this.midFilter.connect(this.trebleFilter);

    // Treble -> FX Split Point
    // Connect to Flanger
    this.trebleFilter.connect(this.flangerDelayNode);
    this.trebleFilter.connect(this.flangerDryGain);
    // Flanger output merger
    const flangerMerger = this.ctx.createGain();
    this.flangerDryGain.connect(flangerMerger);
    this.flangerWetGain.connect(flangerMerger);

    // Flanger -> Crush
    flangerMerger.connect(this.waveShaper);
    flangerMerger.connect(this.crushDryGain);
    const crushMerger = this.ctx.createGain();
    this.crushDryGain.connect(crushMerger);
    this.crushWetGain.connect(crushMerger);

    // Crush -> Delay
    crushMerger.connect(this.delayNode);
    crushMerger.connect(this.delayDryGain);
    const delayMerger = this.ctx.createGain();
    this.delayDryGain.connect(delayMerger);
    this.delayWetGain.connect(delayMerger);

    // Delay -> Reverb
    delayMerger.connect(this.reverbConvolver);
    delayMerger.connect(this.reverbDryGain);
    this.reverbConvolver.connect(this.reverbWetGain);
    const reverbMerger = this.ctx.createGain();
    this.reverbDryGain.connect(reverbMerger);
    this.reverbWetGain.connect(reverbMerger);

    // Reverb -> Master Gain -> Analyser -> Output
    reverbMerger.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public async resume(): Promise<void> {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  private generateImpulseResponse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const factor = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return impulse;
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = amount * 50;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      if (amount === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    return curve;
  }

  // Load Audio File Buffer
  public async loadAudioFile(file: File): Promise<TrackMetadata> {
    this.init();
    if (!this.ctx) throw new Error('AudioContext not available');

    this.stop();
    this.stopSynth();
    this.stopMic();
    this.stopTabAudio();

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    return {
      title: file.name.replace(/\.[^/.]+$/, ''),
      format: file.name.split('.').pop()?.toUpperCase() || 'AUDIO',
      duration: this.audioBuffer.duration,
      sampleRate: this.audioBuffer.sampleRate,
      channels: this.audioBuffer.numberOfChannels,
      isBuiltInDemo: false,
      sourceType: 'file',
    };
  }

  // Load Audio from Web URL (Direct .mp3, .wav, .ogg or audio stream)
  public async loadAudioFromUrl(url: string, title?: string): Promise<TrackMetadata> {
    this.init();
    if (!this.ctx) throw new Error('AudioContext not available');

    this.stop();
    this.stopSynth();
    this.stopMic();
    this.stopTabAudio();

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio stream (${response.status}: ${response.statusText})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    const derivedTitle = title || url.split('/').pop()?.split('?')[0]?.replace(/\.[^/.]+$/, '') || 'WEB STREAM';
    const extension = url.split('.').pop()?.split('?')[0]?.toUpperCase() || 'STREAM';

    return {
      title: derivedTitle.toUpperCase(),
      format: extension,
      duration: this.audioBuffer.duration,
      sampleRate: this.audioBuffer.sampleRate,
      channels: this.audioBuffer.numberOfChannels,
      isBuiltInDemo: false,
      sourceType: 'url',
    };
  }

  // Load Live Progressive Audio Stream (Direct Web Audio streaming without long download wait)
  public async loadStream(url: string, title?: string): Promise<TrackMetadata> {
    this.init();
    if (!this.ctx) throw new Error('AudioContext not available');

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }

    this.stop();
    this.stopSynth();
    this.stopMic();
    this.stopTabAudio();
    this.isYouTubeMode = false;
    this.audioBuffer = null;

    if (!this.streamAudioEl) {
      this.streamAudioEl = new Audio();
      this.streamAudioEl.crossOrigin = 'anonymous';
      this.streamSourceNode = this.ctx.createMediaElementSource(this.streamAudioEl);
      if (this.bassFilter) {
        this.streamSourceNode.connect(this.bassFilter);
      }
    }

    this.streamAudioEl.src = url;
    this.streamAudioEl.playbackRate = this.playbackRate;
    this.streamAudioEl.loop = this.loop;

    this.streamAudioEl.onended = () => {
      this.isPlaying = false;
      this.onEnded?.();
      this.onStatusChange?.('STOPPED');
    };

    this.streamAudioEl.onerror = (e) => {
      console.warn('Stream audio element error:', e);
    };

    try {
      await this.streamAudioEl.play();
      this.isPlaying = true;
      this.isPaused = false;
      this.onStatusChange?.('PLAYING');
    } catch (err) {
      console.warn('Playback gesture needed or stream loading:', err);
      this.isPlaying = false;
      this.isPaused = true;
      this.onStatusChange?.('READY');
    }

    const derivedTitle = (title || 'YOUTUBE LIVE STREAM').toUpperCase();
    return {
      title: derivedTitle,
      format: 'STREAM MP3',
      duration: this.streamAudioEl.duration || 180,
      sampleRate: this.ctx.sampleRate,
      channels: 2,
      isBuiltInDemo: false,
      sourceType: 'url',
    };
  }

  // Play / Pause / Stop Transport
  public play() {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // 1. If streaming live audio element (e.g. YouTube stream)
    if (this.streamAudioEl && this.streamAudioEl.src) {
      this.streamAudioEl.play().catch((err) => console.warn('Stream play error:', err));
      this.isPlaying = true;
      this.isPaused = false;
      this.onStatusChange?.('PLAYING');
      return;
    }

    // 2. If synthesizer is active
    if (this.isSynthRunning) {
      this.isPlaying = true;
      this.isPaused = false;
      this.onStatusChange?.('PLAYING');
      return;
    }

    // 3. If no file loaded, launch the built-in Cyber Synthwave demo beat!
    if (!this.audioBuffer) {
      this.startSynth();
      return;
    }

    if (this.isPlaying) return;

    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.loop = this.loop;
    this.sourceNode.playbackRate.setValueAtTime(this.playbackRate, this.ctx.currentTime);

    // Connect source to bass filter (first in the EQ chain)
    if (this.bassFilter) {
      this.sourceNode.connect(this.bassFilter);
    }

    const offset = Math.max(0, this.pausedAt);
    this.sourceNode.start(0, offset);
    this.startTime = this.ctx.currentTime - offset / this.playbackRate;
    this.isPlaying = true;
    this.isPaused = false;

    this.sourceNode.onended = () => {
      if (this.isPlaying && !this.loop) {
        this.isPlaying = false;
        this.isPaused = false;
        this.pausedAt = 0;
        this.onEnded?.();
        this.onStatusChange?.('STOPPED');
      }
    };

    this.onStatusChange?.('PLAYING');
  }

  public pause() {
    if (this.streamAudioEl && this.streamAudioEl.src) {
      this.streamAudioEl.pause();
      this.isPlaying = false;
      this.isPaused = true;
      this.onStatusChange?.('PAUSED');
      return;
    }

    if (this.isSynthRunning) {
      this.stopSynth();
      this.isPaused = true;
      this.isPlaying = false;
      this.onStatusChange?.('PAUSED');
      return;
    }

    if (!this.isPlaying || !this.sourceNode || !this.ctx) return;

    this.sourceNode.stop();
    this.pausedAt = (this.ctx.currentTime - this.startTime) * this.playbackRate;
    this.isPlaying = false;
    this.isPaused = true;
    this.onStatusChange?.('PAUSED');
  }

  public stop() {
    if (this.streamAudioEl) {
      this.streamAudioEl.pause();
      try {
        this.streamAudioEl.currentTime = 0;
      } catch {}
    }

    if (this.isSynthRunning) {
      this.stopSynth();
    }
    this.stopTabAudio();
    this.isYouTubeMode = false;
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // ignored if already stopped
      }
      this.sourceNode = null;
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.pausedAt = 0;
    this.onStatusChange?.('STOPPED');
  }

  public startYouTubeMode(bpm: number = 126) {
    this.init();
    this.isYouTubeMode = true;
    this.youtubeStartTime = Date.now();
    this.youtubeBpm = bpm;
    this.isPlaying = true;
    this.isPaused = false;
    this.onStatusChange?.('PLAYING');
  }

  public stopYouTubeMode() {
    this.isYouTubeMode = false;
    if (this.isPlaying && !this.sourceNode && !this.streamAudioEl && !this.tabStream && !this.micStream) {
      this.isPlaying = false;
      this.onStatusChange?.('STOPPED');
    }
  }

  public seek(timeInSeconds: number) {
    if (this.streamAudioEl && this.streamAudioEl.src) {
      try {
        this.streamAudioEl.currentTime = timeInSeconds;
      } catch {}
      return;
    }

    if (!this.audioBuffer || !this.ctx) return;

    const clamped = Math.max(0, Math.min(timeInSeconds, this.audioBuffer.duration));
    const wasPlaying = this.isPlaying;

    if (this.isPlaying && this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    this.pausedAt = clamped;

    if (wasPlaying) {
      this.isPlaying = false;
      this.play();
    }
  }

  // Get Current Playback Time
  public getCurrentTime(): number {
    if (this.streamAudioEl && this.streamAudioEl.src) {
      return this.streamAudioEl.currentTime || 0;
    }
    if (this.isSynthRunning) {
      return (this.synthStep * (60 / this.synthBpm) * 0.25);
    }
    if (!this.isPlaying || !this.ctx) {
      return this.pausedAt;
    }
    return (this.ctx.currentTime - this.startTime) * this.playbackRate;
  }

  public hasAudioBuffer(): boolean {
    return !!this.audioBuffer;
  }

  public getDuration(): number {
    if (this.streamAudioEl && this.streamAudioEl.src && !isNaN(this.streamAudioEl.duration) && isFinite(this.streamAudioEl.duration)) {
      return this.streamAudioEl.duration;
    }
    if (this.audioBuffer) return this.audioBuffer.duration;
    if (this.isSynthRunning) return 120; // 2 min demo loop
    return 0;
  }

  // Built-in Cyber Synthwave Engine (synthesizes rich analog beats)
  public startSynth(presetName: string = 'CYBERPUNK') {
    this.init();
    if (!this.ctx) return;

    this.stop();
    this.stopMic();
    this.stopTabAudio();

    if (presetName === 'HOUSE') {
      this.synthBpm = 124;
    } else if (presetName === 'TRAP') {
      this.synthBpm = 140;
    } else {
      this.synthBpm = 126;
    }

    this.isSynthRunning = true;
    this.isPlaying = true;
    this.isPaused = false;
    this.synthStep = 0;

    const intervalMs = (60 / this.synthBpm / 4) * 1000;

    const scheduleNext = () => {
      if (!this.isSynthRunning || !this.ctx) return;
      this.triggerSynthBeat(this.synthStep, presetName);
      this.synthStep = (this.synthStep + 1) % 32;
      this.synthTimerId = window.setTimeout(scheduleNext, intervalMs);
    };

    scheduleNext();
    this.onStatusChange?.('PLAYING');
  }

  public stopSynth() {
    this.isSynthRunning = false;
    if (this.synthTimerId !== null) {
      clearTimeout(this.synthTimerId);
      this.synthTimerId = null;
    }
  }

  private triggerSynthBeat(step: number, preset: string) {
    if (!this.ctx || !this.bassFilter) return;
    const t = this.ctx.currentTime;

    // KICK (Every 4 steps: 0, 4, 8, 12, 16, 20, 24, 28)
    if (step % 4 === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(36, t + 0.12);
      gain.gain.setValueAtTime(1.0, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(this.bassFilter);
      osc.start(t);
      osc.stop(t + 0.32);
    }

    // SNARE (Step 4, 12, 20, 28)
    if (step % 8 === 4) {
      // Noise burst
      const bufferSize = this.ctx.sampleRate * 0.15;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, t);

      const snareGain = this.ctx.createGain();
      snareGain.gain.setValueAtTime(0.6, t);
      snareGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      noise.connect(filter);
      filter.connect(snareGain);
      snareGain.connect(this.bassFilter);
      noise.start(t);
      noise.stop(t + 0.16);

      // Body Tone
      const osc = this.ctx.createOscillator();
      const bodyGain = this.ctx.createGain();
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.08);
      bodyGain.gain.setValueAtTime(0.5, t);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(bodyGain);
      bodyGain.connect(this.bassFilter);
      osc.start(t);
      osc.stop(t + 0.13);
    }

    // HI-HAT (Every off-beat step: 2, 6, 10, 14, 18, 22, 26, 30)
    if (step % 2 === 0) {
      const bufferSize = this.ctx.sampleRate * 0.04;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const hat = this.ctx.createBufferSource();
      hat.buffer = noiseBuffer;
      const hatFilter = this.ctx.createBiquadFilter();
      hatFilter.type = 'highpass';
      hatFilter.frequency.setValueAtTime(7000, t);

      const hatGain = this.ctx.createGain();
      const isAccent = step % 4 === 2;
      hatGain.gain.setValueAtTime(isAccent ? 0.35 : 0.18, t);
      hatGain.gain.exponentialRampToValueAtTime(0.001, t + (isAccent ? 0.06 : 0.03));

      hat.connect(hatFilter);
      hatFilter.connect(hatGain);
      hatGain.connect(this.bassFilter);
      hat.start(t);
      hat.stop(t + 0.07);
    }

    // ROLLING BASSLINE (Cyberpunk saw bass)
    const bassNotes = [55, 55, 55, 55, 65.4, 65.4, 73.4, 82.4, 55, 55, 55, 55, 61.7, 65.4, 49.0, 55];
    const note = bassNotes[step % bassNotes.length];
    if (step % 2 === 0 || step % 4 === 3) {
      const bOsc = this.ctx.createOscillator();
      bOsc.type = 'sawtooth';
      bOsc.frequency.setValueAtTime(note, t);

      const bFilter = this.ctx.createBiquadFilter();
      bFilter.type = 'lowpass';
      bFilter.frequency.setValueAtTime(preset === 'CYBERPUNK' ? 850 : 600, t);
      bFilter.frequency.exponentialRampToValueAtTime(200, t + 0.15);
      bFilter.Q.setValueAtTime(4.0, t);

      const bGain = this.ctx.createGain();
      bGain.gain.setValueAtTime(0.4, t);
      bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      bOsc.connect(bFilter);
      bFilter.connect(bGain);
      bGain.connect(this.bassFilter);
      bOsc.start(t);
      bOsc.stop(t + 0.2);
    }

    // SYNTH ARPEGGIO CHORDS (Cyber Lead on 16th steps)
    const arpNotes = [220, 261.63, 329.63, 440, 523.25, 440, 329.63, 261.63];
    const arpFreq = arpNotes[step % arpNotes.length];
    if (step % 2 === 1) {
      const leadOsc = this.ctx.createOscillator();
      leadOsc.type = 'square';
      leadOsc.frequency.setValueAtTime(arpFreq, t);

      const leadFilter = this.ctx.createBiquadFilter();
      leadFilter.type = 'bandpass';
      leadFilter.frequency.setValueAtTime(1400 + Math.sin(step) * 600, t);
      leadFilter.Q.setValueAtTime(2.5, t);

      const leadGain = this.ctx.createGain();
      leadGain.gain.setValueAtTime(0.12, t);
      leadGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      leadOsc.connect(leadFilter);
      leadFilter.connect(leadGain);
      leadGain.connect(this.bassFilter);
      leadOsc.start(t);
      leadOsc.stop(t + 0.14);
    }
  }

  // Live Microphone Input
  public async toggleMicrophone(): Promise<boolean> {
    this.init();
    if (!this.ctx) return false;

    if (this.micStream) {
      this.stopMic();
      this.onStatusChange?.('STOPPED');
      return false;
    }

    try {
      this.stop();
      this.stopSynth();
      this.stopTabAudio();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micStream = stream;
      this.micSourceNode = this.ctx.createMediaStreamSource(stream);

      if (this.bassFilter) {
        this.micSourceNode.connect(this.bassFilter);
      }

      this.isPlaying = true;
      this.onStatusChange?.('LIVE MIC');
      return true;
    } catch (err) {
      console.error('Microphone access denied:', err);
      return false;
    }
  }

  public stopMic() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.micSourceNode) {
      try {
        this.micSourceNode.disconnect();
      } catch {}
      this.micSourceNode = null;
    }
  }

  // Tab / System Audio Stream Capture (for YouTube, browser audio, or external tabs)
  public async startTabAudioCapture(): Promise<boolean> {
    this.init();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (this.tabStream) {
      this.stopTabAudio();
      this.isPlaying = false;
      this.onStatusChange?.('STOPPED');
      return false;
    }

    try {
      this.stop();
      this.stopSynth();
      this.stopMic();

      // Request screen or tab media with audio enabled
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const audioTracks = displayStream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        displayStream.getTracks().forEach((t) => t.stop());
        throw new Error('No audio track selected. When sharing, be sure to check "Also share tab audio".');
      }

      this.tabStream = displayStream;
      this.tabSourceNode = this.ctx.createMediaStreamSource(displayStream);

      if (this.bassFilter) {
        this.tabSourceNode.connect(this.bassFilter);
      }

      // If user ends share via browser banner, handle clean exit
      audioTracks[0].onended = () => {
        this.stopTabAudio();
        this.isPlaying = false;
        this.onStatusChange?.('STOPPED');
      };

      this.isPlaying = true;
      this.onStatusChange?.('TAB STREAM');
      return true;
    } catch (err) {
      console.error('Display media audio capture error:', err);
      throw err;
    }
  }

  public stopTabAudio() {
    if (this.tabStream) {
      this.tabStream.getTracks().forEach((t) => t.stop());
      this.tabStream = null;
    }
    if (this.tabSourceNode) {
      try {
        this.tabSourceNode.disconnect();
      } catch {}
      this.tabSourceNode = null;
    }
  }

  public getIsTabAudioActive(): boolean {
    return this.tabStream !== null;
  }

  // EQ Controls
  public setEQ(eq: EQSettings) {
    this.currentEQ = { ...eq };
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.bassFilter) {
      this.bassFilter.gain.cancelScheduledValues(t);
      this.bassFilter.gain.setValueAtTime(this.bassFilter.gain.value, t);
      this.bassFilter.gain.linearRampToValueAtTime(eq.bass, t + 0.04);
    }
    if (this.midFilter) {
      this.midFilter.gain.cancelScheduledValues(t);
      this.midFilter.gain.setValueAtTime(this.midFilter.gain.value, t);
      this.midFilter.gain.linearRampToValueAtTime(eq.mid, t + 0.04);
    }
    if (this.trebleFilter) {
      this.trebleFilter.gain.cancelScheduledValues(t);
      this.trebleFilter.gain.setValueAtTime(this.trebleFilter.gain.value, t);
      this.trebleFilter.gain.linearRampToValueAtTime(eq.treble, t + 0.04);
    }
  }

  // FX Controls
  public setFX(fx: FXSettings) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Reverb wet/dry
    if (this.reverbWetGain && this.reverbDryGain) {
      this.reverbWetGain.gain.setValueAtTime(fx.reverb * 0.9, t);
      this.reverbDryGain.gain.setValueAtTime(1 - fx.reverb * 0.4, t);
    }

    // 2. Delay wet/dry + feedback
    if (this.delayWetGain && this.delayDryGain && this.delayFeedbackGain) {
      this.delayWetGain.gain.setValueAtTime(fx.delay * 0.8, t);
      this.delayDryGain.gain.setValueAtTime(1 - fx.delay * 0.3, t);
      this.delayFeedbackGain.gain.setValueAtTime(0.2 + fx.delay * 0.55, t);
    }

    // 3. Flanger wet/dry
    if (this.flangerWetGain && this.flangerDryGain && this.flangerLfoGain) {
      this.flangerWetGain.gain.setValueAtTime(fx.flange * 0.8, t);
      this.flangerDryGain.gain.setValueAtTime(1 - fx.flange * 0.3, t);
      this.flangerLfoGain.gain.setValueAtTime(0.001 + fx.flange * 0.004, t);
    }

    // 4. Bitcrusher / Overdrive
    if (this.waveShaper && this.crushWetGain && this.crushDryGain) {
      this.waveShaper.curve = this.makeDistortionCurve(fx.crush);
      this.crushWetGain.gain.setValueAtTime(fx.crush * 0.9, t);
      this.crushDryGain.gain.setValueAtTime(1 - fx.crush * 0.4, t);
    }
  }

  // Volume & Mute
  public setVolume(val: number) {
    this.cachedVolume = val;
    if (!this.ctx || !this.masterGain) return;
    if (!this.isMuted) {
      this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.ctx || !this.masterGain) return this.isMuted;
    const target = this.isMuted ? 0 : this.cachedVolume;
    this.masterGain.gain.setValueAtTime(target, this.ctx.currentTime);
    return this.isMuted;
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    if (this.streamAudioEl) {
      this.streamAudioEl.playbackRate = rate;
    }
    if (this.sourceNode && this.ctx) {
      this.sourceNode.playbackRate.setValueAtTime(rate, this.ctx.currentTime);
    }
  }

  public setLoop(loop: boolean) {
    this.loop = loop;
    if (this.streamAudioEl) {
      this.streamAudioEl.loop = loop;
    }
    if (this.sourceNode) {
      this.sourceNode.loop = loop;
    }
  }

  // Telemetry & Analyser Data Accessors
  public getByteFrequencyData(dataArray: Uint8Array) {
    if (this.tabStream || this.micStream || this.sourceNode || this.streamAudioEl || this.isSynthRunning) {
      if (this.analyser) {
        this.analyser.getByteFrequencyData(dataArray);
      }
      return;
    }

    if (this.isYouTubeMode && this.isPlaying) {
      const now = (Date.now() - this.youtubeStartTime) / 1000;
      const beatSec = 60 / this.youtubeBpm;
      const beatProgress = (now % beatSec) / beatSec;
      const beatIndex = Math.floor(now / beatSec);

      // Rhythm envelopes
      const isKickHit = beatIndex % 4 === 0 || (beatIndex % 8 === 6 && beatProgress < 0.3);
      const kickEnv = isKickHit ? Math.max(0, 1 - beatProgress * 3.2) : Math.max(0, 0.6 - beatProgress * 2.8);
      const isSnareHit = beatIndex % 4 === 2;
      const snareEnv = isSnareHit ? Math.max(0, 1 - beatProgress * 4.0) : 0;
      const hihatEnv = Math.max(0, 1 - ((now * 4) % 1) * 3.0);

      // EQ gain multipliers (decibels to linear: 10^(dB/20))
      const bassMult = Math.pow(10, this.currentEQ.bass / 20);
      const midMult = Math.pow(10, this.currentEQ.mid / 20);
      const trebleMult = Math.pow(10, this.currentEQ.treble / 20);
      const volMult = this.isMuted ? 0 : this.cachedVolume;

      const len = dataArray.length;
      for (let i = 0; i < len; i++) {
        const norm = i / len;
        let val = 0;

        if (norm < 0.08) {
          // Sub-bass & Kick thump (bins 0..8 triggers particle burst when >195)
          const baseHum = 70 + Math.sin(now * 10 + i) * 15;
          const kickImpact = (isKickHit ? 180 : 120) * kickEnv;
          val = (baseHum + kickImpact) * bassMult;
        } else if (norm < 0.35) {
          // Low mids & Bassline melody
          const bassNote = Math.sin(now * 8 + norm * 20) * 35 + Math.cos(now * 4 - norm * 15) * 25;
          const snareBody = snareEnv * 85;
          val = (75 + bassNote + snareBody) * midMult;
        } else if (norm < 0.7) {
          // Midrange melody, chords, vocal energy
          const synthWave = Math.sin(now * 14 + norm * 30) * 30 + Math.sin(now * 6 + i * 0.8) * 20;
          const snareSnap = snareEnv * 110;
          val = (60 + synthWave + snareSnap) * midMult;
        } else {
          // Highs, hi-hats, percussive air
          const shimmer = Math.random() * 20;
          const hatImpact = hihatEnv * 75;
          val = (45 + shimmer + hatImpact) * trebleMult;
        }

        dataArray[i] = Math.max(0, Math.min(255, Math.floor(val * volMult)));
      }
      return;
    }

    if (this.analyser) {
      this.analyser.getByteFrequencyData(dataArray);
    }
  }

  public getByteTimeDomainData(dataArray: Uint8Array) {
    if (this.tabStream || this.micStream || this.sourceNode || this.streamAudioEl || this.isSynthRunning) {
      if (this.analyser) {
        this.analyser.getByteTimeDomainData(dataArray);
      }
      return;
    }

    if (this.isYouTubeMode && this.isPlaying) {
      const now = (Date.now() - this.youtubeStartTime) / 1000;
      const beatSec = 60 / this.youtubeBpm;
      const beatProgress = (now % beatSec) / beatSec;
      const kickEnv = Math.max(0, 1 - beatProgress * 3.0);
      const volMult = this.isMuted ? 0 : this.cachedVolume;

      const len = dataArray.length;
      for (let i = 0; i < len; i++) {
        const angle = (i / len) * Math.PI * 6;
        const wave = Math.sin(angle * 2 + now * 16) * 0.65 + Math.sin(angle * 5 - now * 24) * 0.35;
        const amplitude = 32 + kickEnv * 48;
        const val = 128 + wave * amplitude * volMult;
        dataArray[i] = Math.max(0, Math.min(255, Math.floor(val)));
      }
      return;
    }

    if (this.analyser) {
      this.analyser.getByteTimeDomainData(dataArray);
    }
  }

  public getFrequencyBinCount(): number {
    return this.analyser ? this.analyser.frequencyBinCount : 256;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getIsLoop(): boolean {
    return this.loop;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsMicActive(): boolean {
    return this.micStream !== null;
  }

  public getSampleRate(): number {
    return this.ctx ? this.ctx.sampleRate : 44100;
  }
}
