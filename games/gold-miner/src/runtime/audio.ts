// Sound effects synthesized with Web Audio, so there are no files to load.
import type { GameEvent } from "../game/sim.ts";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

/** Browsers only allow audio after a user gesture; call this from one. */
export function unlock() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
}

export function setMuted(value: boolean) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.5;
}

interface ToneOptions {
  type?: OscillatorType;
  volume?: number;
  slideTo?: number;
  /** Seconds from now. */
  delay?: number;
}

/** `duration` is in seconds. */
function tone(freq: number, duration: number, options: ToneOptions = {}) {
  if (!ctx || !master) return;
  const { type = "square", volume = 0.15, slideTo, delay = 0 } = options;
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

function noise(duration: number) {
  if (!ctx || !master) return;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  const gain = ctx.createGain();
  gain.gain.value = 0.6;
  source.connect(filter).connect(gain).connect(master);
  source.start();
}

export function play(name: GameEvent["type"]) {
  switch (name) {
    case "fire":
      tone(520, 0.12, { slideTo: 260, volume: 0.08 });
      break;
    case "grab":
      tone(300, 0.08, { type: "triangle", volume: 0.2 });
      break;
    case "grabHeavy":
      tone(140, 0.18, { type: "triangle", volume: 0.3, slideTo: 90 });
      break;
    case "reel":
      tone(900, 0.02, { volume: 0.03 });
      break;
    case "cash":
      tone(880, 0.08, { type: "triangle" });
      tone(1320, 0.12, { type: "triangle", delay: 0.07 });
      break;
    case "cashBig":
      tone(880, 0.08, { type: "triangle" });
      tone(1320, 0.08, { type: "triangle", delay: 0.07 });
      tone(1760, 0.2, { type: "triangle", delay: 0.14 });
      break;
    case "explode":
      noise(0.6);
      break;
    case "bonus":
      tone(660, 0.1, { type: "triangle" });
      tone(990, 0.15, { type: "triangle", delay: 0.1 });
      break;
    case "buy":
      tone(1200, 0.06, { type: "triangle" });
      break;
    case "levelClear":
      for (const [i, f] of [523, 659, 784, 1047].entries()) {
        tone(f, 0.18, { type: "triangle", delay: i * 0.12 });
      }
      break;
    case "gameOver":
      for (const [i, f] of [392, 330, 262].entries()) {
        tone(f, 0.3, { type: "triangle", delay: i * 0.22 });
      }
      break;
  }
}
