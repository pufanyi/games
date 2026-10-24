import type { SoundName } from "../game/types.ts";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
const lastPlayed = new Map<SoundName, number>();

/** Browsers only start audio from a gesture; call this from a click. */
export function unlock(): void {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.45;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setMuted(value: boolean): void {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.45;
}

interface ToneOptions {
  type?: OscillatorType;
  volume?: number;
  slideTo?: number;
  /** Seconds from now. */
  delay?: number;
}

function tone(freq: number, duration: number, options: ToneOptions = {}): void {
  if (!ctx || !master) return;
  const { type = "square", volume = 0.12, slideTo, delay = 0 } = options;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  }
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + duration);
}

function burst(
  duration: number,
  options: { cutoff?: number; volume?: number; delay?: number } = {},
): void {
  if (!ctx || !master) return;
  const { cutoff = 1200, volume = 0.3, delay = 0 } = options;
  const start = ctx.currentTime + delay;
  const source = ctx.createOscillator();
  source.type = "sawtooth";
  source.frequency.setValueAtTime(180, start);
  source.frequency.exponentialRampToValueAtTime(40, start + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  source.connect(filter).connect(gain).connect(master);
  source.start(start);
  source.stop(start + duration);
}

/** Play one of the simulation's sound events, throttled per name. */
export function play(name: SoundName): void {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  const last = lastPlayed.get(name) ?? -1;
  if (now - last < 0.035) return;
  lastPlayed.set(name, now);
  switch (name) {
    case "click":
      tone(760, 0.04, { type: "triangle", volume: 0.05 });
      break;
    case "error":
      tone(170, 0.14, { type: "sawtooth", volume: 0.12, slideTo: 120 });
      break;
    case "deploy":
      tone(420, 0.1, { type: "triangle" });
      tone(630, 0.14, { type: "triangle", delay: 0.08 });
      break;
    case "upgrade":
      for (const [i, freq] of [523, 659, 784].entries()) {
        tone(freq, 0.12, { type: "triangle", delay: i * 0.07 });
      }
      break;
    case "coin":
      tone(1180, 0.06, { type: "triangle", volume: 0.09 });
      tone(1560, 0.09, { type: "triangle", delay: 0.055 });
      break;
    case "heal":
      tone(660, 0.12, { type: "sine", volume: 0.16 });
      tone(990, 0.2, { type: "sine", delay: 0.1 });
      break;
    case "slipper":
      burst(0.12, { cutoff: 2400, volume: 0.12 });
      tone(300, 0.08, { type: "triangle", slideTo: 520, volume: 0.06 });
      break;
    case "rifle":
      burst(0.16, { cutoff: 3600, volume: 0.3 });
      tone(180, 0.09, { type: "square", slideTo: 90, volume: 0.1 });
      break;
    case "dumbbell":
      tone(120, 0.16, { type: "square", volume: 0.16, slideTo: 60 });
      break;
    case "catapult":
      tone(520, 0.1, { type: "triangle", volume: 0.12, slideTo: 220 });
      break;
    case "bottle":
      burst(0.1, { cutoff: 3000, volume: 0.16 });
      tone(900, 0.1, { type: "triangle", volume: 0.08, slideTo: 500 });
      break;
    case "cracker":
      burst(0.28, { cutoff: 5200, volume: 0.32 });
      break;
    case "impact":
      burst(0.09, { cutoff: 700, volume: 0.16 });
      break;
    case "burn":
      burst(0.14, { cutoff: 1400, volume: 0.1 });
      break;
    case "house-hit":
      tone(96, 0.2, { type: "square", volume: 0.18, slideTo: 54 });
      burst(0.12, { cutoff: 500, volume: 0.2 });
      break;
    case "death":
      tone(300, 0.22, { type: "triangle", volume: 0.1, slideTo: 110 });
      break;
    case "win":
      for (const [i, freq] of [523, 659, 784, 1047].entries()) {
        tone(freq, 0.24, { type: "triangle", delay: i * 0.14 });
      }
      break;
    case "lose":
      for (const [i, freq] of [392, 330, 262, 196].entries()) {
        tone(freq, 0.3, { type: "triangle", delay: i * 0.2 });
      }
      break;
  }
}
