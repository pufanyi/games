import { step } from "../game/simulation.ts";
import type { State } from "../game/types.ts";
import { render } from "../rendering/renderer.ts";
import { Sound } from "./audio.ts";
import { Controls, GAME_KEYS } from "./input.ts";
export class Session {
  readonly controls: Controls;
  readonly sound = new Sound();
  paused = false;
  private frame = 0;
  private last = 0;
  private elapsed = 0;
  private observer: ResizeObserver;
  private context: CanvasRenderingContext2D;
  constructor(
    readonly state: State,
    private canvas: HTMLCanvasElement,
    private change: (paused: boolean) => void,
  ) {
    const c = canvas.getContext("2d");
    if (!c) throw new Error("Canvas 2D is unavailable.");
    this.context = c;
    this.controls = new Controls(state.settings.players);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
    window.addEventListener("blur", this.blur);
    document.addEventListener("visibilitychange", this.visibility);
    this.resize();
    canvas.focus();
    this.frame = requestAnimationFrame(this.loop);
  }
  private resize() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(
      600,
      Math.round(this.canvas.clientWidth * ratio),
    );
    this.canvas.height = Math.round(this.canvas.width * 0.75);
    this.context.setTransform(
      this.canvas.width / 600,
      0,
      0,
      this.canvas.height / 450,
      0,
      0,
    );
    render(this.context, this.state);
  }
  private keydown = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLElement &&
      ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(e.target.tagName)
    ) return;
    if (e.code === "KeyP" || e.code === "Escape") {
      e.preventDefault();
      if (!e.repeat) this.pause(!this.paused);
      return;
    }
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    if (this.paused || this.state.status !== "playing") return;
    this.sound.unlock();
    if (!e.repeat) this.controls.key(e.code, true);
  };
  private keyup = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.code)) {
      e.preventDefault();
      this.controls.key(e.code, false);
    }
  };
  private blur = () => this.pause(true);
  private visibility = () => {
    if (document.hidden) this.pause(true);
  };
  pause(paused: boolean) {
    if (this.state.status !== "playing") return;
    this.paused = paused;
    this.controls.clear();
    this.elapsed = 0;
    this.sound.pause(paused);
    this.change(paused);
  }
  private loop = (time: number) => {
    const delta = this.last ? Math.min(200, time - this.last) : 0;
    this.last = time;
    if (!this.paused && this.state.status === "playing") {
      this.elapsed += delta;
      while (this.elapsed >= 1000 / 30 && this.state.status === "playing") {
        step(this.state, this.controls.read());
        this.sound.play(this.state.events);
        this.sound.beat(this.state.tick);
        this.elapsed -= 1000 / 30;
        if (this.state.tick % 30 === 0 || this.state.status !== "playing") {
          this.change(false);
        }
      }
    }
    render(this.context, this.state);
    this.frame = requestAnimationFrame(this.loop);
  };
  dispose() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.clear();
    this.sound.dispose();
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
    window.removeEventListener("blur", this.blur);
    document.removeEventListener("visibilitychange", this.visibility);
  }
}
