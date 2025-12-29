// Helper to configure audio constraints and processing
export interface AudioProcessingOptions {
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  suppressionLevel: "low" | "medium" | "high";
  useRNNoise?: boolean;
  // Advanced options
  vadEnabled?: boolean;        // Voice Activity Detection
  vadThreshold?: number;       // VAD sensitivity (0-100)
  vadGracePeriod?: number;     // Grace period before muting (ms)
  highPassFilter?: boolean;    // Remove low frequency noise (fan, hum)
  highPassCutoff?: number;     // HPF cutoff frequency (Hz)
  // Professional audio options
  audioQuality?: "basic" | "balanced" | "professional" | "ultra";
  useNoiseGate?: boolean;      // Noise gate for cleaner audio
  noiseGateThreshold?: number; // Noise gate threshold (dB)
  useVoiceEQ?: boolean;        // Voice-optimized EQ
  useDeEsser?: boolean;        // Sibilance reduction
  useLimiter?: boolean;        // Peak protection
  outputGain?: number;         // Output gain multiplier
}

export const DEFAULT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export const getAudioConstraints = (options: AudioProcessingOptions): MediaTrackConstraints => {
  // When RNNoise is enabled, we want minimal browser processing
  // because RNNoise will handle noise suppression via AudioWorklet
  if (options.useRNNoise) {
    return {
      // Disable browser audio processing when using RNNoise
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      // Still request good quality audio
      sampleRate: { ideal: 48000 },
      channelCount: { ideal: 1 },
    };
  }
  
  // Chrome works better with direct boolean values for initial getUserMedia
  // 'ideal' constraints should be used only with applyConstraints()
  // For getUserMedia, Chrome prefers simple boolean values
  
  const constraints: MediaTrackConstraints = {
    // Use direct boolean values for initial stream request
    // This works more reliably across Chrome versions
    echoCancellation: options.echoCancellation,
    noiseSuppression: options.noiseSuppression,
    autoGainControl: options.autoGainControl,
    // Add sample rate for better quality
    sampleRate: { ideal: 48000 },
    // Add channel count
    channelCount: { ideal: 1 },
  };

  return constraints;
};

// Audio Quality Presets
// IMPORTANT: Basic mode = most stable, no audio cuts
export const AUDIO_QUALITY_PRESETS = {
  basic: {
    audioQuality: "basic" as const,
    useRNNoise: false,       // Browser NS is already professional
    useNoiseGate: false,     // No noise gate = no audio cuts
    useVoiceEQ: false,
    useDeEsser: false,
    useLimiter: false,
    vadEnabled: false,       // CRITICAL: VAD causes audio cuts!
    highPassFilter: false,   // Let browser handle everything
    outputGain: 1.0,
  },
  balanced: {
    audioQuality: "balanced" as const,
    useRNNoise: false,       // Browser NS instead
    useNoiseGate: false,     // Disable to prevent cuts
    noiseGateThreshold: -50,
    useVoiceEQ: false,
    useDeEsser: false,
    useLimiter: false,
    vadEnabled: false,       // VAD disabled
    vadThreshold: 40,
    highPassFilter: true,
    highPassCutoff: 80,
    outputGain: 1.0,
  },
  professional: {
    audioQuality: "professional" as const,
    useRNNoise: true,        // RNNoise for max quality
    useNoiseGate: false,     // No noise gate
    noiseGateThreshold: -55,
    useVoiceEQ: true,
    useDeEsser: false,
    useLimiter: true,
    vadEnabled: false,       // VAD disabled
    vadThreshold: 50,
    highPassFilter: true,
    highPassCutoff: 100,
    outputGain: 1.1,
  },
  ultra: {
    audioQuality: "ultra" as const,
    useRNNoise: true,
    useNoiseGate: false,     // Disabled - was causing cuts
    noiseGateThreshold: -70,
    useVoiceEQ: true,
    useDeEsser: true,
    useLimiter: true,
    vadEnabled: false,       // VAD disabled
    vadThreshold: 80,
    vadGracePeriod: 150,
    highPassFilter: true,
    highPassCutoff: 120,
    outputGain: 1.2,
  }
};

export const getAudioQualityPreset = (quality: "basic" | "balanced" | "professional" | "ultra"): Partial<AudioProcessingOptions> => {
  return AUDIO_QUALITY_PRESETS[quality];
};

// Advanced VAD (Voice Activity Detection) with noise gate
export class VoiceActivityDetector {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private threshold: number;
  private isSpeakingState: boolean = false;
  private silenceStartTime: number = 0;
  private gracePeriod: number;
  private lastSpeechTime: number = 0;
  
  // Frequency ranges for voice detection
  private readonly VOICE_FREQ_MIN = 80;   // Human voice starts around 80Hz
  private readonly VOICE_FREQ_MAX = 3400; // Most voice energy below 3.4kHz
  
  // Noise rejection parameters
  private readonly NOISE_FLOOR = 5;       // Minimum noise threshold
  private readonly SPEECH_RATIO = 2.5;    // Speech must be 2.5x louder than noise

  constructor(
    stream: MediaStream, 
    audioContext: AudioContext, 
    threshold = 25,      // Higher threshold = less sensitive
    gracePeriod = 300    // 300ms grace period before muting
  ) {
    this.audioContext = audioContext;
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;  // Higher resolution for better frequency analysis
    this.analyser.smoothingTimeConstant = 0.6; // Smooth out sudden changes
    this.threshold = threshold;
    this.gracePeriod = gracePeriod;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
  }

  private getFrequencyBin(frequency: number): number {
    return Math.floor(frequency / (this.audioContext.sampleRate / this.analyser.fftSize));
  }

  isSpeaking(): boolean {
    this.analyser.getByteFrequencyData(this.dataArray);
    
    const voiceStartBin = this.getFrequencyBin(this.VOICE_FREQ_MIN);
    const voiceEndBin = this.getFrequencyBin(this.VOICE_FREQ_MAX);
    
    // Calculate energy in voice frequency range
    let voiceEnergy = 0;
    let voiceCount = 0;
    for (let i = voiceStartBin; i < voiceEndBin; i++) {
      voiceEnergy += this.dataArray[i];
      voiceCount++;
    }
    const voiceLevel = voiceCount > 0 ? voiceEnergy / voiceCount : 0;
    
    // Calculate noise floor (very low frequencies - fan, AC, hum)
    const noiseBin = this.getFrequencyBin(60); // 60Hz and below (electrical hum, fan)
    let noiseEnergy = 0;
    for (let i = 0; i < noiseBin; i++) {
      noiseEnergy += this.dataArray[i];
    }
    const noiseLevel = noiseBin > 0 ? noiseEnergy / noiseBin : 0;
    
    // Calculate high frequency noise (keyboard clicks, mouse clicks)
    const highNoiseStartBin = this.getFrequencyBin(4000);
    let highNoiseEnergy = 0;
    let highNoiseCount = 0;
    for (let i = highNoiseStartBin; i < this.dataArray.length; i++) {
      highNoiseEnergy += this.dataArray[i];
      highNoiseCount++;
    }
    const highNoiseLevel = highNoiseCount > 0 ? highNoiseEnergy / highNoiseCount : 0;
    
    // Speech detection logic (Discord-level aggressive):
    // 1. Voice level must exceed threshold (higher for ultra mode)
    // 2. Voice level must be MUCH higher than noise floor (3x minimum)
    // 3. High frequency noise shouldn't dominate (keyboard/mouse clicks)
    // 4. Minimum voice energy required (prevent false positives)
    const isVoicePresent = 
      voiceLevel > this.threshold &&
      voiceLevel > (noiseLevel * Math.max(3.0, this.SPEECH_RATIO)) &&  // Increased from 2.5 to 3.0
      voiceLevel > (highNoiseLevel * 2.0) &&  // Increased from 1.5 to 2.0
      voiceLevel > 30; // Minimum absolute threshold (Discord-like)
    
    const currentTime = Date.now();
    
    if (isVoicePresent) {
      // Voice detected
      this.lastSpeechTime = currentTime;
      this.isSpeakingState = true;
      this.silenceStartTime = 0;
    } else if (this.isSpeakingState) {
      // Was speaking, check grace period
      if (this.silenceStartTime === 0) {
        this.silenceStartTime = currentTime;
      }
      
      if (currentTime - this.silenceStartTime > this.gracePeriod) {
        // Grace period expired, stop speaking
        this.isSpeakingState = false;
      }
    }
    
    return this.isSpeakingState;
  }

  // Get current voice level (0-100)
  getVoiceLevel(): number {
    this.analyser.getByteFrequencyData(this.dataArray);
    
    const voiceStartBin = this.getFrequencyBin(this.VOICE_FREQ_MIN);
    const voiceEndBin = this.getFrequencyBin(this.VOICE_FREQ_MAX);
    
    let sum = 0;
    let count = 0;
    for (let i = voiceStartBin; i < voiceEndBin; i++) {
      sum += this.dataArray[i];
      count++;
    }
    
    return count > 0 ? Math.min(100, (sum / count) * 0.4) : 0;
  }
  
  // Update threshold dynamically
  setThreshold(threshold: number): void {
    this.threshold = Math.max(5, Math.min(100, threshold));
  }
  
  // Update grace period
  setGracePeriod(ms: number): void {
    this.gracePeriod = Math.max(100, Math.min(2000, ms));
  }

  disconnect(): void {
    // Analyzer node cleanup is handled by AudioContext
  }
}

// High-Pass Filter to remove low frequency noise (fan, AC hum, rumble)
export class HighPassFilter {
  private audioContext: AudioContext;
  private filterNode: BiquadFilterNode;
  private inputNode: AudioNode | null = null;
  private outputNode: AudioNode | null = null;

  constructor(audioContext: AudioContext, cutoffFrequency = 80) {
    this.audioContext = audioContext;
    
    // Create high-pass filter (removes frequencies below cutoff)
    this.filterNode = audioContext.createBiquadFilter();
    this.filterNode.type = 'highpass';
    this.filterNode.frequency.value = cutoffFrequency; // Remove frequencies below 80Hz
    this.filterNode.Q.value = 0.7071; // Butterworth response (flat passband)
  }

  connect(input: AudioNode, output: AudioNode): void {
    this.inputNode = input;
    this.outputNode = output;
    
    input.connect(this.filterNode);
    this.filterNode.connect(output);
  }

  setCutoffFrequency(frequency: number): void {
    // Human voice typically 80-3400Hz, fan noise is usually 50-100Hz
    this.filterNode.frequency.setValueAtTime(
      Math.max(20, Math.min(200, frequency)),
      this.audioContext.currentTime
    );
  }

  disconnect(): void {
    if (this.inputNode && this.outputNode) {
      this.filterNode.disconnect();
    }
  }
  
  getNode(): BiquadFilterNode {
    return this.filterNode;
  }
}

// DC Blocker - Removes DC offset to prevent clicks and pops
export class DCBlocker {
  private filterNode: BiquadFilterNode;

  constructor(audioContext: AudioContext) {
    this.filterNode = audioContext.createBiquadFilter();
    this.filterNode.type = 'highpass';
    this.filterNode.frequency.value = 5; // Block DC and very low frequencies
    this.filterNode.Q.value = 0.7071;
  }

  getNode(): BiquadFilterNode {
    return this.filterNode;
  }

  disconnect(): void {
    this.filterNode.disconnect();
  }
}

// Noise Gate - Cuts audio below threshold to eliminate background noise
export class NoiseGate {
  private compressor: DynamicsCompressorNode;

  constructor(
    audioContext: AudioContext,
    threshold = -50,  // dB
    attack = 0.005,   // 5ms
    release = 0.1,    // 100ms
    ratio = 20        // Hard gating
  ) {
    // Use compressor with extreme settings to create gate effect
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(threshold, audioContext.currentTime);
    this.compressor.knee.setValueAtTime(0, audioContext.currentTime); // Hard knee
    this.compressor.ratio.setValueAtTime(ratio, audioContext.currentTime);
    this.compressor.attack.setValueAtTime(attack, audioContext.currentTime);
    this.compressor.release.setValueAtTime(release, audioContext.currentTime);
  }

  getNode(): DynamicsCompressorNode {
    return this.compressor;
  }

  setThreshold(threshold: number, audioContext: AudioContext): void {
    this.compressor.threshold.setValueAtTime(threshold, audioContext.currentTime);
  }

  disconnect(): void {
    this.compressor.disconnect();
  }
}

// Spectral Gate - Frequency-specific noise suppression
// Filters out keyboard clicks, breath sounds, claps
export class SpectralGate {
  private lowShelf: BiquadFilterNode;   // Remove low rumble (breath, wind)
  private notch1: BiquadFilterNode;     // Remove keyboard clicks (2-4kHz)
  private notch2: BiquadFilterNode;     // Remove sharp transients (6-8kHz)
  private highShelf: BiquadFilterNode;  // Reduce high frequency noise
  private inputNode: GainNode;
  private outputNode: GainNode;

  constructor(audioContext: AudioContext) {
    this.inputNode = audioContext.createGain();
    this.outputNode = audioContext.createGain();

    // Low shelf: Reduce breath sounds and wind noise (below 200Hz)
    this.lowShelf = audioContext.createBiquadFilter();
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 200;
    this.lowShelf.gain.value = -12; // -12dB reduction

    // Notch 1: Target keyboard clicks (2.5-3.5kHz range)
    this.notch1 = audioContext.createBiquadFilter();
    this.notch1.type = 'notch';
    this.notch1.frequency.value = 3000;
    this.notch1.Q.value = 5; // Narrow notch

    // Notch 2: Target claps and sharp transients (6-7kHz)
    this.notch2 = audioContext.createBiquadFilter();
    this.notch2.type = 'notch';
    this.notch2.frequency.value = 6500;
    this.notch2.Q.value = 4;

    // High shelf: Reduce sibilance and high frequency noise (above 8kHz)
    this.highShelf = audioContext.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 8000;
    this.highShelf.gain.value = -6; // -6dB reduction

    // Chain: input → lowShelf → notch1 → notch2 → highShelf → output
    this.inputNode.connect(this.lowShelf);
    this.lowShelf.connect(this.notch1);
    this.notch1.connect(this.notch2);
    this.notch2.connect(this.highShelf);
    this.highShelf.connect(this.outputNode);
  }

  getInputNode(): GainNode {
    return this.inputNode;
  }

  getOutputNode(): GainNode {
    return this.outputNode;
  }

  disconnect(): void {
    try {
      this.lowShelf.disconnect();
      this.notch1.disconnect();
      this.notch2.disconnect();
      this.highShelf.disconnect();
      this.inputNode.disconnect();
      this.outputNode.disconnect();
    } catch { /* ignore */ }
  }
}

// Aggressive Multi-Band HPF - Discord-level noise filtering (simplified)
export class AggressiveHPF {
  private hpf1: BiquadFilterNode;  // Primary HPF
  private hpf2: BiquadFilterNode;  // Secondary HPF (steeper cutoff)
  
  constructor(audioContext: AudioContext, cutoff1: number = 100, cutoff2: number = 120) {
    // First HPF - Remove very low frequencies
    this.hpf1 = audioContext.createBiquadFilter();
    this.hpf1.type = 'highpass';
    this.hpf1.frequency.value = cutoff1;
    this.hpf1.Q.value = 0.7071;
    
    // Second HPF - Steeper cutoff for fan/AC noise
    this.hpf2 = audioContext.createBiquadFilter();
    this.hpf2.type = 'highpass';
    this.hpf2.frequency.value = cutoff2;
    this.hpf2.Q.value = 1.414; // Sharper cutoff
    
    // Chain: hpf1 -> hpf2
    this.hpf1.connect(this.hpf2);
  }
  
  getInputNode(): BiquadFilterNode {
    return this.hpf1;
  }
  
  getOutputNode(): BiquadFilterNode {
    return this.hpf2;
  }
  
  disconnect(): void {
    try {
      this.hpf1.disconnect();
      this.hpf2.disconnect();
    } catch { /* ignore */ }
  }
}

// Voice EQ - 3-band parametric EQ optimized for voice
export class VoiceEQ {
  private presenceBoost: BiquadFilterNode;
  private highCut: BiquadFilterNode;
  private inputNode: GainNode;
  private outputNode: GainNode;

  constructor(audioContext: AudioContext) {
    this.inputNode = audioContext.createGain();
    this.outputNode = audioContext.createGain();

    // Presence boost (3kHz) - adds clarity and intelligibility
    this.presenceBoost = audioContext.createBiquadFilter();
    this.presenceBoost.type = 'peaking';
    this.presenceBoost.frequency.value = 3000;
    this.presenceBoost.gain.value = 3; // +3dB
    this.presenceBoost.Q.value = 1.5;

    // High cut (8kHz) - reduce harshness and sibilance
    this.highCut = audioContext.createBiquadFilter();
    this.highCut.type = 'peaking';
    this.highCut.frequency.value = 8000;
    this.highCut.gain.value = -2; // -2dB
    this.highCut.Q.value = 0.7;

    // Connect chain
    this.inputNode.connect(this.presenceBoost);
    this.presenceBoost.connect(this.highCut);
    this.highCut.connect(this.outputNode);
  }

  getInputNode(): GainNode {
    return this.inputNode;
  }

  getOutputNode(): GainNode {
    return this.outputNode;
  }

  setPresenceGain(gain: number, audioContext: AudioContext): void {
    this.presenceBoost.gain.setValueAtTime(
      Math.max(-6, Math.min(6, gain)),
      audioContext.currentTime
    );
  }

  disconnect(): void {
    this.presenceBoost.disconnect();
    this.highCut.disconnect();
    this.inputNode.disconnect();
    this.outputNode.disconnect();
  }
}

// De-Esser - Reduces harsh sibilance (S, SH sounds)
export class DeEsser {
  private highShelf: BiquadFilterNode;
  private inputNode: GainNode;
  private outputNode: GainNode;

  constructor(audioContext: AudioContext) {
    this.inputNode = audioContext.createGain();
    this.outputNode = audioContext.createGain();

    // High shelf filter to reduce sibilance (6-9kHz)
    this.highShelf = audioContext.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 6000;
    this.highShelf.gain.value = -3; // -3dB reduction in high frequencies
    this.highShelf.Q.value = 0.7;

    // Connect: input → highShelf → output
    this.inputNode.connect(this.highShelf);
    this.highShelf.connect(this.outputNode);
  }

  getInputNode(): GainNode {
    return this.inputNode;
  }

  getOutputNode(): GainNode {
    return this.outputNode;
  }

  disconnect(): void {
    try {
      this.highShelf.disconnect();
      this.inputNode.disconnect();
      this.outputNode.disconnect();
    } catch { /* ignore */ }
  }
}

// Limiter - Prevents clipping and peak distortion
export class Limiter {
  private compressor: DynamicsCompressorNode;

  constructor(audioContext: AudioContext) {
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-1, audioContext.currentTime); // -1dB threshold
    this.compressor.knee.setValueAtTime(0, audioContext.currentTime); // Hard knee
    this.compressor.ratio.setValueAtTime(20, audioContext.currentTime); // High ratio = limiting
    this.compressor.attack.setValueAtTime(0.001, audioContext.currentTime); // Very fast attack
    this.compressor.release.setValueAtTime(0.1, audioContext.currentTime); // Medium release
  }

  getNode(): DynamicsCompressorNode {
    return this.compressor;
  }

  setThreshold(threshold: number, audioContext: AudioContext): void {
    this.compressor.threshold.setValueAtTime(
      Math.max(-10, Math.min(-0.1, threshold)),
      audioContext.currentTime
    );
  }

  disconnect(): void {
    this.compressor.disconnect();
  }
}

// Professional Audio Chain - Combines all processors
export class ProfessionalAudioChain {
  private audioContext: AudioContext;
  private dcBlocker: DCBlocker;
  private aggressiveHPF: AggressiveHPF;
  private spectralGate: SpectralGate | null;
  private highPassFilter: HighPassFilter;
  private noiseGate: NoiseGate;
  private voiceEQ: VoiceEQ;
  private deEsser: DeEsser;
  private compressor: DynamicsCompressorNode;
  private limiter: Limiter;
  private outputGain: GainNode;

  constructor(audioContext: AudioContext, isUltraMode: boolean = false) {
    this.audioContext = audioContext;
    
    // Create all processors
    this.dcBlocker = new DCBlocker(audioContext);
    this.aggressiveHPF = new AggressiveHPF(audioContext, isUltraMode ? 100 : 60, isUltraMode ? 150 : 100);
    
    // Spectral gate only in ultra mode for maximum noise reduction
    this.spectralGate = isUltraMode ? new SpectralGate(audioContext) : null;
    
    this.highPassFilter = new HighPassFilter(audioContext, isUltraMode ? 150 : 100);
    this.noiseGate = new NoiseGate(
      audioContext, 
      isUltraMode ? -70 : -55,  // Ultra mode: extreme aggressive gate
      0.002,   // Very fast attack for ultra mode
      0.06,    // Very short release
      20       // Maximum valid ratio
    );
    this.voiceEQ = new VoiceEQ(audioContext);
    this.deEsser = new DeEsser(audioContext);
    
    // Soft compressor for gentle dynamic control
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-50, audioContext.currentTime);
    this.compressor.knee.setValueAtTime(20, audioContext.currentTime);
    this.compressor.ratio.setValueAtTime(6, audioContext.currentTime);
    this.compressor.attack.setValueAtTime(0.005, audioContext.currentTime);
    this.compressor.release.setValueAtTime(0.15, audioContext.currentTime);
    
    this.limiter = new Limiter(audioContext);
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = isUltraMode ? 1.3 : 1.2; // Ultra: +2.3dB, Pro: +1.6dB
  }

  // Connect the entire chain
  connect(input: AudioNode, output: AudioNode): void {
    // Professional signal chain order:
    // input → DC blocker → Aggressive HPF → HPF → gate → EQ → de-esser → compressor → limiter → gain → output
    
    try {
      input.connect(this.dcBlocker.getNode());
      this.dcBlocker.getNode().connect(this.aggressiveHPF.getInputNode());
      this.aggressiveHPF.getOutputNode().connect(this.highPassFilter.getNode());
      this.highPassFilter.getNode().connect(this.noiseGate.getNode());
      this.noiseGate.getNode().connect(this.voiceEQ.getInputNode());
      this.voiceEQ.getOutputNode().connect(this.deEsser.getInputNode());
      this.deEsser.getOutputNode().connect(this.compressor);
      this.compressor.connect(this.limiter.getNode());
      this.limiter.getNode().connect(this.outputGain);
      this.outputGain.connect(output);
    } catch (e) {
      throw e;
    }
  }

  // For RNNoise integration, insert RNNoise after gate
  connectWithRNNoise(input: AudioNode, rnnoiseNode: AudioNode, output: AudioNode): void {
    // Ultra-aggressive signal chain with RNNoise (Discord-level):
    // input → DC blocker → Aggressive HPF → Spectral Gate → HPF → gate → RNNoise → EQ → de-esser → compressor → limiter → gain → output
    
    try {
      input.connect(this.dcBlocker.getNode());
      this.dcBlocker.getNode().connect(this.aggressiveHPF.getInputNode());
      
      // Insert spectral gate after aggressive HPF (ultra mode only)
      if (this.spectralGate) {
        this.aggressiveHPF.getOutputNode().connect(this.spectralGate.getInputNode());
        this.spectralGate.getOutputNode().connect(this.highPassFilter.getNode());
      } else {
        this.aggressiveHPF.getOutputNode().connect(this.highPassFilter.getNode());
      }
      
      this.highPassFilter.getNode().connect(this.noiseGate.getNode());
      this.noiseGate.getNode().connect(rnnoiseNode);
      rnnoiseNode.connect(this.voiceEQ.getInputNode());
      this.voiceEQ.getOutputNode().connect(this.deEsser.getInputNode());
      this.deEsser.getOutputNode().connect(this.compressor);
      this.compressor.connect(this.limiter.getNode());
      this.limiter.getNode().connect(this.outputGain);
      this.outputGain.connect(output);
    } catch (e) {
      throw e;
    }
  }

  setNoiseGateThreshold(threshold: number): void {
    this.noiseGate.setThreshold(threshold, this.audioContext);
  }

  setOutputGain(gain: number): void {
    this.outputGain.gain.setValueAtTime(
      Math.max(0.1, Math.min(2, gain)),
      this.audioContext.currentTime
    );
  }

  getOutputNode(): GainNode {
    return this.outputGain;
  }

  disconnect(): void {
    try {
      this.dcBlocker.disconnect();
      this.aggressiveHPF.disconnect();
      if (this.spectralGate) {
        this.spectralGate.disconnect();
      }
      this.highPassFilter.disconnect();
      this.noiseGate.disconnect();
      this.voiceEQ.disconnect();
      this.deEsser.disconnect();
      this.compressor.disconnect();
      this.limiter.disconnect();
      this.outputGain.disconnect();
    } catch { /* ignore */ }
  }
}
