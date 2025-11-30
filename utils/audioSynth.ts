
// A simple Web Audio API Synthesizer for Retro VN Sounds

class AudioSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmInterval: any = null; // Using any for Timeout to avoid NodeJS type conflicts in browser
  private isPlaying: boolean = false;
  private currentMood: string = 'neutral';
  private currentWave: OscillatorType = 'sine';
  private currentTempo: number = 500;

  constructor() {
    // Lazy init
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; // Default volume
      this.masterGain.connect(this.ctx.destination);
    }
  }

  public async start() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.isPlaying = true;
  }

  public stop() {
    this.isPlaying = false;
    if (this.bgmInterval) clearInterval(this.bgmInterval);
    // Do NOT close context, just stop scheduling. 
    // Suspending context can cause issues if restarted quickly.
    // Instead we just stop the BGM interval and let notes fade out.
  }

  public setVolume(val: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
    }
  }

  // --- BGM ENGINE ---

  public playTheme(mood: string, tempoStr: string, wave: OscillatorType) {
    this.init();
    if (!this.isPlaying) return;
    if (this.ctx?.state === 'suspended') this.ctx.resume();

    // If same mood/wave, don't restart logic to keep flow, just update params
    if (this.currentMood === mood && this.currentWave === wave && this.bgmInterval) return;

    this.currentMood = mood;
    this.currentWave = wave;
    
    // Map tempo string to ms
    const tempoMap: Record<string, number> = { 'fast': 200, 'medium': 400, 'slow': 800 };
    this.currentTempo = tempoMap[tempoStr] || 400;

    if (this.bgmInterval) clearInterval(this.bgmInterval);

    // Scales (Frequency map approx)
    const scales: Record<string, number[]> = {
      'happy': [261.6, 329.6, 392.0, 523.3], // Major arpeggio
      'romantic': [261.6, 329.6, 392.0, 493.9], // Major 7th
      'sad': [293.7, 349.2, 440.0, 587.3], // Minorish
      'mystery': [261.6, 311.1, 370.0, 415.3], // Diminished/Chromatic feel
      'suspense': [100, 110, 100, 115], // Low throbbing
      'action': [392.0, 392.0, 523.3, 261.6, 392.0] // Fast jumps
    };

    const notes = scales[mood] || scales['happy'];
    let noteIdx = 0;

    this.bgmInterval = setInterval(() => {
      if (!this.isPlaying) return;
      
      const noteFreq = notes[noteIdx % notes.length];
      
      // Play Note
      this.playTone(noteFreq, this.currentWave, 0.2);

      // Advance logic
      if (Math.random() > 0.7) {
        noteIdx = Math.floor(Math.random() * notes.length);
      } else {
        noteIdx++;
      }

    }, this.currentTempo);
  }

  private playTone(freq: number, type: OscillatorType, duration: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    // Envelope
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.05); // Attack
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration); // Decay

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration + 0.1);
  }

  // --- SFX ENGINE ---

  public playSFX(trigger: string) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    switch (trigger) {
      case 'sparkle':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
        break;

      case 'shock':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
        break;

      case 'heartbeat':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(60, t);
        gain.gain.setValueAtTime(0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
        // Double beat
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(60, t + 0.2);
        gain2.gain.setValueAtTime(0.6, t + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(t + 0.2);
        osc2.stop(t + 0.35);
        break;
        
      case 'door_slam':
        osc.type = 'square';
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 0.1);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
        
      case 'typing':
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, t);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
        osc.start(t);
        osc.stop(t + 0.03);
        break;
    }
  }
}

export const audioSynth = new AudioSynth();
