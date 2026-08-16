export class RetroSoundFX {
  ctx: AudioContext | null = null;

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  playBeep(freq = 440, duration = 0.05, type: OscillatorType = 'sine') {
    try {
      this.init();
      if (!this.ctx) return;
      
      // Se o contexto estiver suspenso (ex: autoplay policy do navegador), tenta resumir
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio play blocked", e);
    }
  }

  playLaser() { this.playBeep(800, 0.08, 'sawtooth'); }
  playCoin() { this.playBeep(987.77, 0.1, 'square'); }
  playSelect() { this.playBeep(520, 0.04, 'triangle'); }
  playBack() { this.playBeep(320, 0.06, 'sawtooth'); }
  playSave() { this.playBeep(1046.50, 0.15, 'sine'); }
  playTurbo() { this.playBeep(1200, 0.04, 'square'); }
}

export const sfx = new RetroSoundFX();
