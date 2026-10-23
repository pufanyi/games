import type { GameEvent } from "../game/types.ts";
export class Sound {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
  music = true;
  unlock() {
    try {
      this.context ??= new AudioContext();
      if (!this.master) {
        this.master = this.context.createGain();
        this.master.gain.value = 0.16;
        this.master.connect(this.context.destination);
      }
      void this.context.resume().catch(() => {});
    } catch { /* Audio is optional when the browser has no output device. */ }
  }
  tone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume = 0.3,
    end?: number,
  ) {
    const c = this.context, output = this.master;
    if (!c || !output || this.muted || c.state !== "running") return;
    const oscillator = c.createOscillator(),
      gain = c.createGain(),
      now = c.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (end) {
      oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    }
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  play(events: GameEvent[]) {
    for (const e of events.slice(0, 8)) {
      if (e.kind === "blast") this.tone(100, 0.24, "sawtooth", 0.35, 25);
      else if (e.kind === "pickup" || e.kind === "checkpoint") {
        this.tone(660, 0.16, "sine", 0.4, 1100);
      } else if (e.kind === "hit") this.tone(260, 0.2, "triangle", 0.4, 65);
      else if (e.kind === "shot") this.tone(420, 0.07, "triangle", 0.15, 190);
      else this.tone(180, 0.08, "sine", 0.3, 120);
    }
  }
  beat(tick: number) {
    if (!this.music || tick % 8 !== 0) return;
    const notes = [
      64,
      67,
      71,
      67,
      62,
      67,
      69,
      67,
      60,
      64,
      67,
      64,
      62,
      66,
      69,
      66,
    ];
    this.tone(
      440 * 2 ** ((notes[Math.floor(tick / 8) % notes.length] - 69) / 12),
      0.12,
      "triangle",
      0.12,
    );
    if (tick % 32 === 0) this.tone(130.81, 0.2, "sine", 0.12);
  }
  pause(paused: boolean) {
    if (this.master && this.context) {
      this.master.gain.setValueAtTime(
        paused ? 0 : 0.16,
        this.context.currentTime,
      );
    }
  }
  dispose() {
    void this.context?.close().catch(() => {});
    this.context = null;
    this.master = null;
  }
}
