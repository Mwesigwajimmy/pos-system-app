/**
 * SOVEREIGN AUDIO ENGINE (INDUSTRIAL OMEGA VERSION)
 * 
 * CORE ARCHITECTURAL FEATURES:
 * 1. ZERO-LATENCY: Optimized for high-speed supermarket scanning.
 * 2. DUAL-MODE FEEDBACK: Distinct high-frequency success and low-frequency error signals.
 * 3. BROWSER AUTONOMY: Handles auto-play restrictions gracefully.
 * 4. OSCILLATOR FALLBACK: Mathematically generates sound if MP3 assets fail.
 */

export class DeepAudioEngine {
  // Pre-load audio paths from the public directory
  private static SUCCESS_PATH = '/audio/success-beep.mp3';
  private static ERROR_PATH = '/audio/error-beep.mp3';

  /**
   * PLAY SUCCESS SIGNAL
   * Triggered on successful barcode scan or payment authorization.
   */
  static playSuccess() {
    this.executeSound(this.SUCCESS_PATH, 880, 'sine'); // 880Hz is a clear high 'A' note
  }

  /**
   * PLAY ERROR SIGNAL
   * Triggered on unknown item, database failure, or payment decline.
   */
  static playError() {
    this.executeSound(this.ERROR_PATH, 220, 'square'); // 220Hz square wave creates a harsh 'Buzz'
  }

  /**
   * EXECUTE SOUND HANDSHAKE
   * Deeply attempts to play the physical file, falling back to the 
   * Internal Oscillator if the file is blocked or missing.
   */
  private static async executeSound(path: string, freq: number, waveType: OscillatorType) {
    if (typeof window === 'undefined') return;

    try {
      const audio = new Audio(path);
      
      // Industrial Optimization: Reset to 0 for rapid-fire scanning
      audio.currentTime = 0; 
      
      await audio.play();
    } catch (err) {
      // DEEP LOGIC FALLBACK:
      // If the browser blocks the file (404, Auto-play policy, or deleted file),
      // we generate the sound mathematically using the system's AudioContext.
      console.warn(`[Audio Engine] Physical file ${path} unavailable. Initiating Oscillator Fallback.`);
      this.triggerInternalOscillator(freq, waveType);
    }
  }

  /**
   * INTERNAL OSCILLATOR (THE "GHOST" BEEP)
   * Generates sound directly from the sound card without needing any files.
   */
  private static triggerInternalOscillator(frequency: number, type: OscillatorType) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      // Set volume low (0.05) to avoid distortion in supermarket environments
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15); // Short sharp burst of 150ms
    } catch (e) {
      console.error("[Audio Engine] Master Hardware Audio Failure", e);
    }
  }
}