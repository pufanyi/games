import {
  beginCharge,
  cancelCharge,
  isActive,
  moveCue,
  pickUp,
  place,
  releaseCharge,
  type Session,
  setPaused,
  setPower,
  setTip,
  shootNow,
  start,
  toggleGuide,
  turnAim,
} from "./session.ts";

const DEGREE = Math.PI / 180;

/** Returns cleanup so remounts never accumulate global input listeners. */
export function bindKeyboard(session: Session, refresh: () => void) {
  const onKey = (event: KeyboardEvent) => {
    if (session.mode === "title") {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        start(session);
        refresh();
      }
      return;
    }
    if (event.key === "p" || event.key === "P" || event.key === "Escape") {
      setPaused(session, !session.paused);
      refresh();
      return;
    }
    // Focused controls own activation; global Space must not also fire a shot.
    if (event.target instanceof HTMLButtonElement) return;
    // Let the elevation slider have its own arrow keys.
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === "g" || event.key === "G") {
      toggleGuide(session);
      refresh();
      return;
    }
    if (!isActive(session)) return;
    const { game } = session;
    const step = event.shiftKey ? 0.1 : 1;
    if (game.phase === "placing") {
      const cue = game.balls[0];
      const move = 0.01 * step;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-move, 0],
        ArrowRight: [move, 0],
        ArrowUp: [0, move],
        ArrowDown: [0, -move],
      };
      if (moves[event.key]) {
        event.preventDefault();
        moveCue(
          session,
          cue.x + moves[event.key][0],
          cue.y + moves[event.key][1],
        );
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        place(session);
      }
      refresh();
      return;
    }
    if (game.phase !== "aiming") return;
    const [right, up] = session.tip;
    switch (event.key) {
      case "ArrowLeft":
        turnAim(session, step * DEGREE);
        break;
      case "ArrowRight":
        turnAim(session, -step * DEGREE);
        break;
      case "ArrowUp":
        setPower(session, session.power + 0.05);
        break;
      case "ArrowDown":
        setPower(session, session.power - 0.05);
        break;
      case " ":
        if (!event.repeat) beginCharge(session, "keyboard");
        break;
      case "Enter":
        if (!event.repeat) shootNow(session);
        break;
      case "w":
      case "W":
        setTip(session, right, up + 0.1);
        break;
      case "s":
      case "S":
        setTip(session, right, up - 0.1);
        break;
      case "a":
      case "A":
        setTip(session, right - 0.1, up);
        break;
      case "d":
      case "D":
        setTip(session, right + 0.1, up);
        break;
      case "m":
      case "M":
        pickUp(session);
        break;
      default:
        return;
    }
    event.preventDefault();
    refresh();
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key !== " " || session.charge !== "keyboard") return;
    event.preventDefault();
    releaseCharge(session, "keyboard");
    refresh();
  };
  const onBlur = () => {
    cancelCharge(session);
    refresh();
  };
  const onVisibility = () => {
    if (document.hidden) {
      setPaused(session, true);
      refresh();
    }
  };
  addEventListener("keydown", onKey);
  addEventListener("keyup", onKeyUp);
  addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    cancelCharge(session);
    removeEventListener("keydown", onKey);
    removeEventListener("keyup", onKeyUp);
    removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
