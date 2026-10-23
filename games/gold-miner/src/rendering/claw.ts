// The grab on the end of the rope: a seized rope eye, a D-shackle, a riveted
// housing, and two hooked steel jaws (plus a third behind them) that pivot
// shut on a catch.
import { circlePath, type Ctx, INK, ink } from "./paint.ts";

/** How far each jaw swings out when the claw is open, in radians. */
const OPEN_ANGLE = 0.5;
/** Where a jaw hinges on the housing (right jaw; the left mirrors it). */
const PIVOT = { x: 4, y: 3 };

/**
 * Draws the claw with its origin at the rope's end, pointing along the rope
 * (`angle` from straight down, as in the simulation). When it holds
 * something, `drawHeld` paints the catch between the back prong and the
 * front jaws, so the jaws close around it; an empty claw hangs open.
 */
export function drawClaw(
  ctx: Ctx,
  x: number,
  y: number,
  angle: number,
  drawHeld?: () => void,
) {
  const open = drawHeld ? 0 : 1;
  const place = () => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-angle);
    ctx.scale(1.1, 1.1);
  };

  place();
  backProng(ctx, open);
  ctx.restore();
  drawHeld?.();

  place();
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.translate(PIVOT.x, PIVOT.y);
    ctx.rotate(-open * OPEN_ANGLE);
    ctx.translate(-PIVOT.x, -PIVOT.y);
    jaw(ctx);
    ctx.restore();
  }
  ropeEye(ctx);
  shackle(ctx);
  housing(ctx);
  ctx.restore();
}

/** Brushed steel, lit from the top left. */
function steel(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, "#eef2f5");
  g.addColorStop(0.45, "#a4afb9");
  g.addColorStop(1, "#56626d");
  return g;
}

/** A small domed rivet. */
function rivet(ctx: Ctx, x: number, y: number, r = 1) {
  circlePath(ctx, x, y, r);
  ctx.fillStyle = "#4a545d";
  ctx.fill();
  circlePath(ctx, x - r * 0.3, y - r * 0.35, r * 0.45);
  ctx.fillStyle = "#e6ebef";
  ctx.fill();
}

/** A shorter middle prong, seen behind the two jaws for depth. */
function backProng(ctx: Ctx, open: number) {
  const tip = 21 - open * 2;
  ctx.beginPath();
  ctx.moveTo(-2.8, 5);
  ctx.quadraticCurveTo(-3.6, tip - 6, 0, tip);
  ctx.quadraticCurveTo(3.6, tip - 6, 2.8, 5);
  ctx.closePath();
  const g = ctx.createLinearGradient(-3, 0, 3, 0);
  g.addColorStop(0, "#7d8893");
  g.addColorStop(1, "#3f4850");
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, 1.5);
}

/** The right jaw, closed: a curved hook with a toothed inner edge. */
function jaw(ctx: Ctx) {
  const shape = new Path2D();
  shape.moveTo(1.5, 2.5);
  shape.bezierCurveTo(10, 2.5, 15.5, 10, 12.5, 18);
  shape.quadraticCurveTo(9.5, 24.5, 1, 25.5);
  shape.lineTo(3.8, 21.2);
  shape.quadraticCurveTo(8.2, 18.5, 8.6, 13.5);
  shape.quadraticCurveTo(8.2, 8.2, 1.5, 7.8);
  shape.closePath();
  ctx.fillStyle = steel(ctx, 2, 2, 14, 22);
  ctx.fill(shape);

  // Shade along the inside of the curve, and a central rib.
  ctx.save();
  ctx.clip(shape);
  ctx.strokeStyle = "rgb(40 50 60 / 0.45)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(3.8, 21.2);
  ctx.quadraticCurveTo(8.2, 18.5, 8.6, 13.5);
  ctx.quadraticCurveTo(8.2, 8.2, 1.5, 7.8);
  ctx.stroke();
  ctx.strokeStyle = "rgb(40 50 60 / 0.3)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(3.5, 5.2);
  ctx.bezierCurveTo(9, 5.6, 12, 11, 10.6, 16.5);
  ctx.quadraticCurveTo(8.6, 21.6, 3, 23.6);
  ctx.stroke();
  ctx.restore();

  // Bevel catching the light along the outer edge.
  ctx.strokeStyle = "rgb(255 255 255 / 0.75)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(3, 4);
  ctx.bezierCurveTo(9.5, 4.2, 13.4, 9.8, 11.6, 15.5);
  ctx.stroke();

  ink(ctx, 1.7, shape);

  // Two teeth biting inward.
  ctx.fillStyle = "#c5ced6";
  for (const [tx, ty] of [[8.4, 16.6], [8.1, 10.6]]) {
    ctx.beginPath();
    ctx.moveTo(tx + 0.2, ty - 1.6);
    ctx.lineTo(tx - 2.6, ty);
    ctx.lineTo(tx + 0.2, ty + 1.6);
    ctx.closePath();
    ctx.fill();
    ink(ctx, 1);
  }

  // Darkened, sharpened tip with a glint.
  ctx.beginPath();
  ctx.moveTo(1, 25.5);
  ctx.lineTo(3.8, 21.2);
  ctx.lineTo(6.2, 23.4);
  ctx.closePath();
  ctx.fillStyle = "#4a545d";
  ctx.fill();
  ink(ctx, 1);
  circlePath(ctx, 3.4, 23.2, 0.6);
  ctx.fillStyle = "#fff";
  ctx.fill();

  rivet(ctx, 6.8, 6.6);
}

/** The rope's end, bound with twine where it loops through the shackle. */
function ropeEye(ctx: Ctx) {
  ctx.beginPath();
  ctx.ellipse(0, -13.2, 2.6, 2.4, 0, 0, Math.PI * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.6;
  ctx.stroke();
  ctx.strokeStyle = "#b08250";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-2.4, -21, 4.8, 5.2, 1.2);
  ctx.fillStyle = "#d8b07a";
  ctx.fill();
  ink(ctx, 1.2);
  ctx.beginPath();
  for (const wy of [-19.4, -17.6]) {
    ctx.moveTo(-2.4, wy);
    ctx.lineTo(2.4, wy + 0.6);
  }
  ink(ctx, 0.8);
}

/** A D-shackle with a bolt through the housing's top. */
function shackle(ctx: Ctx) {
  ctx.beginPath();
  ctx.moveTo(-3.8, -4);
  ctx.lineTo(-3.8, -9);
  ctx.arc(0, -9, 3.8, Math.PI, 0);
  ctx.lineTo(3.8, -4);
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4.4;
  ctx.stroke();
  ctx.strokeStyle = "#a4afb9";
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.strokeStyle = "rgb(255 255 255 / 0.7)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-3.8, -5);
  ctx.lineTo(-3.8, -9);
  ctx.arc(0, -9, 3.8, Math.PI, Math.PI * 1.6);
  ctx.stroke();
}

/** The block the jaws hinge on: side plates, rivets, and a brass pivot. */
function housing(ctx: Ctx) {
  // Top plate the shackle bolts through.
  ctx.beginPath();
  ctx.roundRect(-6.5, -6.5, 13, 4, 1.5);
  ctx.fillStyle = "#c3ccd4";
  ctx.fill();
  ink(ctx, 1.4);
  for (const nx of [-5.6, 5.6]) {
    circlePath(ctx, nx, -4.5, 1.5);
    ctx.fillStyle = "#e8c35a";
    ctx.fill();
    ink(ctx, 0.9);
  }

  // Body: a bevelled block, darker on its lower half.
  const body = new Path2D();
  body.moveTo(-7, -3);
  body.lineTo(7, -3);
  body.lineTo(9.5, 1);
  body.lineTo(7.5, 7.5);
  body.lineTo(-7.5, 7.5);
  body.lineTo(-9.5, 1);
  body.closePath();
  ctx.fillStyle = steel(ctx, -6, -3, 4, 8);
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = "rgb(30 40 50 / 0.25)";
  ctx.fillRect(-10, 3.5, 20, 5);
  ctx.strokeStyle = "rgb(255 255 255 / 0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6.4, -1.8);
  ctx.lineTo(6.4, -1.8);
  ctx.stroke();
  ctx.restore();
  ink(ctx, 1.8, body);

  for (const [rx, ry] of [[-6.6, 0.6], [6.6, 0.6], [-5.6, 5.2], [5.6, 5.2]]) {
    rivet(ctx, rx, ry, 0.95);
  }

  // Brass pivot bolt with a washer and a screw slot.
  circlePath(ctx, 0, 2.2, 3.3);
  ctx.fillStyle = "#9aa6b1";
  ctx.fill();
  ink(ctx, 1);
  circlePath(ctx, 0, 2.2, 2.3);
  const brass = ctx.createRadialGradient(-0.8, 1.4, 0.2, 0, 2.2, 2.4);
  brass.addColorStop(0, "#fff0b0");
  brass.addColorStop(1, "#c8962a");
  ctx.fillStyle = brass;
  ctx.fill();
  ink(ctx, 0.9);
  ctx.beginPath();
  ctx.moveTo(-1.4, 3.2);
  ctx.lineTo(1.4, 1.2);
  ink(ctx, 0.8);
}
