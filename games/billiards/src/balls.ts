// Drawing balls that visibly roll: each one is shaded pixel by pixel from its
// 3D orientation, so numbers, stripes and the cue ball's spots turn the way
// the physics spins them. A ball is a few thousand pixels, so redrawing all 16
// every frame is cheap.

/** Orientation as a unit quaternion [w, x, y, z]. */
export type Quat = [number, number, number, number];

/** Turns `q` by angular velocity (wx, wy, wz) for `dt` seconds. */
export function spin(
  q: Quat,
  wx: number,
  wy: number,
  wz: number,
  dt: number,
): Quat {
  const w = Math.sqrt(wx * wx + wy * wy + wz * wz);
  if (w * dt < 1e-9) return q;
  const half = (w * dt) / 2;
  const s = Math.sin(half) / w;
  const [bw, bx, by, bz] = [Math.cos(half), wx * s, wy * s, wz * s];
  const [aw, ax, ay, az] = q;
  // The rotation is about world axes, so it multiplies on the left.
  const r: Quat = [
    bw * aw - bx * ax - by * ay - bz * az,
    bw * ax + bx * aw + by * az - bz * ay,
    bw * ay - bx * az + by * aw + bz * ax,
    bw * az + bx * ay - by * ax + bz * aw,
  ];
  const n = Math.hypot(...r);
  return [r[0] / n, r[1] / n, r[2] / n, r[3] / n];
}

/** A random orientation, so a fresh rack doesn't look printed on. */
export function randomQuat(random: () => number): Quat {
  const [u, v, w] = [random(), random(), random()];
  const a = Math.sqrt(1 - u);
  const b = Math.sqrt(u);
  return [
    a * Math.sin(2 * Math.PI * v),
    a * Math.cos(2 * Math.PI * v),
    b * Math.sin(2 * Math.PI * w),
    b * Math.cos(2 * Math.PI * w),
  ];
}

/**
 * The number facing up and upright, for the potted-ball tray: the ball's
 * local x, y, z axes turned to world z, x, y.
 */
export const NUMBER_UP: Quat = [0.5, -0.5, -0.5, -0.5];

const COLORS: Record<number, [number, number, number]> = {
  0: [246, 242, 230],
  1: [246, 190, 20],
  2: [28, 78, 186],
  3: [214, 38, 42],
  4: [92, 46, 142],
  5: [242, 112, 26],
  6: [22, 128, 62],
  7: [138, 28, 36],
  8: [22, 22, 24],
};
const WHITE: [number, number, number] = [246, 242, 230];
const SPOT: [number, number, number] = [200, 30, 40];

export function ballColor(id: number): string {
  const [r, g, b] = COLORS[id > 8 ? id - 8 : id];
  return `rgb(${r} ${g} ${b})`;
}

/** The number disc covers the cap around the ball's local x axis. */
const DISC = 0.86;
const DISC_RADIUS = Math.sqrt(1 - DISC * DISC);
/** Stripes cover this band around the local equator. */
const STRIPE = 0.5;
const TEXTURE = 64;

// Light from the top left, in world coordinates (y up, z toward the viewer).
const LIGHT = normalize(-0.45, 0.55, 0.7);
const HALF = normalize(LIGHT[0], LIGHT[1], LIGHT[2] + 1);

function normalize(x: number, y: number, z: number): [number, number, number] {
  const n = Math.hypot(x, y, z);
  return [x / n, y / n, z / n];
}

/** Paints balls of one size; one canvas per ball, reused every frame. */
export class BallPainter {
  private readonly size: number;
  private readonly sprites = new Map<number, HTMLCanvasElement>();
  private readonly pixels: ImageData;
  private readonly numbers = new Map<number, Uint8ClampedArray>();

  /** `radius` is in device pixels. */
  constructor(private readonly radius: number) {
    this.size = Math.ceil(radius * 2) + 2;
    this.pixels = new ImageData(this.size, this.size);
  }

  /** Draws ball `id` at (x, y) in the context's units, `r` across. */
  draw(
    ctx: CanvasRenderingContext2D,
    id: number,
    q: Quat,
    x: number,
    y: number,
    r: number,
  ) {
    const sprite = this.sprite(id);
    this.paint(id, q);
    const sctx = sprite.getContext("2d");
    sctx?.putImageData(this.pixels, 0, 0);
    const scale = r / this.radius;
    const half = (this.size / 2) * scale;
    ctx.drawImage(sprite, x - half, y - half, half * 2, half * 2);
  }

  private sprite(id: number): HTMLCanvasElement {
    let sprite = this.sprites.get(id);
    if (!sprite) {
      sprite = document.createElement("canvas");
      sprite.width = sprite.height = this.size;
      this.sprites.set(id, sprite);
    }
    return sprite;
  }

  private paint(id: number, q: Quat) {
    const data = this.pixels.data;
    const size = this.size;
    const c = size / 2;
    const r = this.radius;
    const base = COLORS[id > 8 ? id - 8 : id];
    const striped = id > 8;
    const number = id === 0 ? null : this.number(id);
    // Rotation matrix of q; world = M·local, so local = Mᵀ·world.
    const [w, qx, qy, qz] = q;
    const m00 = 1 - 2 * (qy * qy + qz * qz);
    const m01 = 2 * (qx * qy - w * qz);
    const m02 = 2 * (qx * qz + w * qy);
    const m10 = 2 * (qx * qy + w * qz);
    const m11 = 1 - 2 * (qx * qx + qz * qz);
    const m12 = 2 * (qy * qz - w * qx);
    const m20 = 2 * (qx * qz - w * qy);
    const m21 = 2 * (qy * qz + w * qx);
    const m22 = 1 - 2 * (qx * qx + qy * qy);

    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const o = (j * size + i) * 4;
        const px = (i + 0.5 - c) / r;
        const py = (c - j - 0.5) / r;
        const d2 = px * px + py * py;
        const edge = (1 - Math.sqrt(d2)) * r + 0.5;
        if (edge <= 0) {
          data[o + 3] = 0;
          continue;
        }
        const nz = Math.sqrt(Math.max(0, 1 - d2));
        const lx = m00 * px + m10 * py + m20 * nz;
        const ly = m01 * px + m11 * py + m21 * nz;
        const lz = m02 * px + m12 * py + m22 * nz;

        let color = base;
        if (id === 0) {
          // Six small spots, so the cue ball's spin shows.
          const near = Math.max(Math.abs(lx), Math.abs(ly), Math.abs(lz));
          color = near > 0.985 ? SPOT : WHITE;
        } else if (Math.abs(lx) > DISC && number) {
          // Read the disc from outside on both sides of the ball.
          const side = lx > 0 ? 1 : -1;
          const u = Math.floor(((side * ly) / DISC_RADIUS + 1) * TEXTURE / 2);
          const v = Math.floor(((-lz) / DISC_RADIUS + 1) * TEXTURE / 2);
          const t = (Math.min(Math.max(v, 0), TEXTURE - 1) * TEXTURE +
            Math.min(Math.max(u, 0), TEXTURE - 1)) * 4;
          if (number[t + 3] > 128) {
            color = [number[t], number[t + 1], number[t + 2]];
          }
        } else if (striped) {
          color = Math.abs(lz) < STRIPE ? base : WHITE;
        }

        const lambert = Math.max(
          0,
          px * LIGHT[0] + py * LIGHT[1] + nz * LIGHT[2],
        );
        const h = Math.max(0, px * HALF[0] + py * HALF[1] + nz * HALF[2]);
        const h2 = h * h;
        const h4 = h2 * h2;
        const h16 = h4 * h4 * h4 * h4;
        const specular = h16 * h16 * 0.7 * 255;
        const light = 0.3 + 0.75 * lambert;
        data[o] = color[0] * light + specular;
        data[o + 1] = color[1] * light + specular;
        data[o + 2] = color[2] * light + specular;
        data[o + 3] = Math.min(edge, 1) * 255;
      }
    }
  }

  /** The white disc with the ball's number, as RGBA pixels. */
  private number(id: number): Uint8ClampedArray {
    let pixels = this.numbers.get(id);
    if (!pixels) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = TEXTURE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return new Uint8ClampedArray(TEXTURE * TEXTURE * 4);
      ctx.fillStyle = "rgb(246 242 230)";
      ctx.beginPath();
      ctx.arc(TEXTURE / 2, TEXTURE / 2, TEXTURE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#151515";
      ctx.font = `bold ${id > 9 ? 30 : 36}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(id), TEXTURE / 2, TEXTURE / 2 + 2);
      pixels = ctx.getImageData(0, 0, TEXTURE, TEXTURE).data;
      this.numbers.set(id, pixels);
    }
    return pixels;
  }
}
