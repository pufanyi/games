// Sound effects synthesized with Web Audio, so there are no files to load.
// Clicks and thuds get louder with the impact speed.
import type { GameEvent } from "./game.ts";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
/** Shared white noise, filtered differently for each sound. */
let noiseBuffer: AudioBuffer | null = null;

/** Browsers only allow audio after a user gesture; call this from one. */
export function unlock() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume();
}

export function setMuted(value: boolean) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.6;
}

interface Sound {
  /** Seconds. */
  duration: number;
  volume: number;
  delay?: number;
}

/** A short burst of filtered noise: the body of every clack and thud. */
function burst(
  filter: BiquadFilterType,
  frequency: number,
  { duration, volume, delay = 0 }: Sound,
) {
  if (!ctx || !master || !noiseBuffer) return;
  const start = ctx.currentTime + delay;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  const shape = ctx.createBiquadFilter();
  shape.type = filter;
  shape.frequency.value = frequency;
  shape.Q.value = filter === "bandpass" ? 4 : 0.7;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  source.connect(shape).connect(gain).connect(master);
  source.start(start, Math.random() * 0.3, duration);
}

function tone(
  freq: number,
  { duration, volume, delay = 0 }: Sound,
  type: OscillatorType = "sine",
) {
  if (!ctx || !master) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + duration);
}

/** 0–1 from an impact speed in m/s. */
const loudness = (speed: number) => Math.min(1, 0.08 + speed / 4);

export function play(event: GameEvent) {
  switch (event.type) {
    case "strike":
      burst("bandpass", 1800, {
        duration: 0.05,
        volume: 0.2 + event.speed / 15,
      });
      break;
    case "ball": {
      // Phenolic balls: a bright, hard clack.
      const v = loudness(event.speed);
      burst("bandpass", 3200, { duration: 0.035, volume: 0.9 * v });
      tone(2600, { duration: 0.03, volume: 0.15 * v });
      break;
    }
    case "cushion":
      burst("lowpass", 500, {
        duration: 0.09,
        volume: 0.6 * loudness(event.speed),
      });
      break;
    case "pocket":
      burst("lowpass", 300, { duration: 0.18, volume: 0.8 });
      burst("bandpass", 1400, { duration: 0.05, volume: 0.25, delay: 0.12 });
      burst("bandpass", 1200, { duration: 0.05, volume: 0.15, delay: 0.24 });
      break;
    case "foul":
      tone(180, { duration: 0.35, volume: 0.12 }, "square");
      break;
    case "won":
      for (const [i, f] of [523, 659, 784, 1047].entries()) {
        tone(f, { duration: 0.2, volume: 0.15, delay: i * 0.12 }, "triangle");
      }
      break;
    case "lost":
      for (const [i, f] of [392, 330, 262].entries()) {
        tone(f, { duration: 0.3, volume: 0.15, delay: i * 0.22 }, "triangle");
      }
      break;
  }
}
