// Visual rotation only; physics remains independent of rendering.
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
