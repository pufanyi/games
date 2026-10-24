import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Path,
  RingGeometry,
  Shape,
  ShapeGeometry,
  ShapeUtils,
  Vector2,
} from "three";
import { CUSHION_HEIGHT } from "../physics/constants.ts";
import { type Cushion, TABLE } from "../physics/table.ts";
import { clothTexture, woodTexture } from "./textures.ts";

/** From the cushion nose back to the wooden rail. */
const CUSHION_DEPTH = 0.05;
/** The wooden rail's top, beyond the cushions. */
const RAIL_WIDTH = 0.12;
const OUTER = CUSHION_DEPTH + RAIL_WIDTH;
/** Cushion tops and the rail meet flush, a little above the nose. */
export const RAIL_TOP = 0.045;
const RAIL_THICKNESS = 0.07;
/** The cut through the rail around each pocket hole. */
const CUT = 0.002;
/** The floor, a standard table's playing height below the cloth. */
export const FLOOR = -0.76;

type Point = [number, number];

/**
 * The cushion cross-section as (depth behind the nose, height): an undercut
 * face up to the nose at the physics height, then a rounded top back to the
 * rail. The last point is replaced by the cushion's back edge.
 */
const PROFILE: Point[] = [
  [0.011, 0],
  [0.0045, 0.018],
  [0.0012, 0.03],
  [0, CUSHION_HEIGHT],
  [0.0012, CUSHION_HEIGHT + 0.0035],
  [0.0045, CUSHION_HEIGHT + 0.0062],
  [0.01, RAIL_TOP - 0.0012],
  [0.018, RAIL_TOP],
  [Infinity, RAIL_TOP],
];

interface Edge {
  /** The nose, directed counterclockwise around the table (play on the left). */
  a: Point;
  b: Point;
  /** Where the cushion's back meets the rail, at each end. */
  backA: Point;
  backB: Point;
}

interface PocketCut {
  x: number;
  y: number;
  radius: number;
  /** Angles where the jaws' backs meet the cut, and the pocket's axis. */
  enter: number;
  leave: number;
  axis: number;
}

const sub = (p: Point, q: Point): Point => [p[0] - q[0], p[1] - q[1]];
const add = (p: Point, q: Point, k = 1): Point => [
  p[0] + q[0] * k,
  p[1] + q[1] * k,
];
const dot = (p: Point, q: Point) => p[0] * q[0] + p[1] * q[1];

/** The outward (right-hand) unit normal of a counterclockwise edge. */
function normal(a: Point, b: Point): Point {
  const [dx, dy] = sub(b, a);
  const length = Math.hypot(dx, dy);
  return [dy / length, -dx / length];
}

/** Where two edges' backs meet: the miter of their offset lines. */
function miter(at: Point, n1: Point, n2: Point): Point {
  const k = CUSHION_DEPTH / (1 + dot(n1, n2));
  return [at[0] + (n1[0] + n2[0]) * k, at[1] + (n1[1] + n2[1]) * k];
}

/** From a jaw's end over the hole, straight back until it meets the cut. */
function toCut(from: Point, n: Point, cx: number, cy: number, r: number) {
  const [ox, oy] = sub(from, [cx, cy]);
  const b = dot([ox, oy], n);
  const t = -b + Math.sqrt(b * b - (ox * ox + oy * oy - r * r));
  return add(from, n, t);
}

const TAU = Math.PI * 2;
const ccw = (from: number, to: number) => ((to - from) % TAU + TAU) % TAU;

/** Points along a pocket cut, counterclockwise. */
function arc(cut: PocketCut, from: number, to: number, r = cut.radius) {
  const sweep = ccw(from, to);
  const steps = Math.max(2, Math.ceil(sweep / 0.12));
  return Array.from({ length: steps + 1 }, (_, i): Point => {
    const angle = from + (sweep * i) / steps;
    return [cut.x + r * Math.cos(angle), cut.y + r * Math.sin(angle)];
  });
}

/**
 * The table outline from the physics cushions: every nose edge with its back,
 * and each pocket's cut through the rail.
 */
function outline() {
  const pockets = TABLE.pockets;
  const jaw = (i: number) => ({
    enter: TABLE.cushions[3 * i],
    leave: TABLE.cushions[3 * i + 1],
    rail: TABLE.cushions[3 * i + 2],
  });
  const point = (c: Cushion, end: "a" | "b"): Point =>
    end === "a" ? [c.ax, c.ay] : [c.bx, c.by];
  const edges: Edge[][] = [];
  const cuts: PocketCut[] = [];
  for (let i = 0; i < pockets.length; i++) {
    const { enter, leave, rail } = jaw(i);
    const prev = jaw((i + pockets.length - 1) % pockets.length).rail;
    const next = jaw((i + 1) % pockets.length).enter;
    const p = pockets[i];
    const r = p.radius + CUT;
    const nPrev = normal(point(prev, "a"), point(prev, "b"));
    const nEnter = normal(point(enter, "a"), point(enter, "b"));
    const nLeave = normal(point(leave, "b"), point(leave, "a"));
    const nRail = normal(point(rail, "a"), point(rail, "b"));
    const nNext = normal(point(next, "a"), point(next, "b"));
    const enterBack = toCut(point(enter, "b"), nEnter, p.x, p.y, r);
    const leaveBack = toCut(point(leave, "b"), nLeave, p.x, p.y, r);
    const angle = (q: Point) => Math.atan2(q[1] - p.y, q[0] - p.x);
    const mouth: Point = [
      (enter.ax + leave.ax) / 2,
      (enter.ay + leave.ay) / 2,
    ];
    cuts.push({
      x: p.x,
      y: p.y,
      radius: r,
      enter: angle(enterBack),
      leave: angle(leaveBack),
      axis: Math.atan2(p.y - mouth[1], p.x - mouth[0]),
    });
    edges.push([
      {
        a: point(enter, "a"),
        b: point(enter, "b"),
        backA: miter(point(enter, "a"), nPrev, nEnter),
        backB: enterBack,
      },
      {
        a: point(leave, "b"),
        b: point(leave, "a"),
        backA: leaveBack,
        backB: miter(point(leave, "a"), nLeave, nRail),
      },
      {
        a: point(rail, "a"),
        b: point(rail, "b"),
        backA: miter(point(rail, "a"), nLeave, nRail),
        backB: miter(point(rail, "b"), nRail, nNext),
      },
    ]);
  }
  return { edges, cuts };
}

/** One cushion: the profile swept along its nose, mitered at each end. */
function cushionGeometry(edge: Edge, capA: boolean, capB: boolean) {
  const n = normal(edge.a, edge.b);
  const length = Math.hypot(...sub(edge.b, edge.a));
  const section = (nose: Point, back: Point) => {
    const m = sub(back, nose);
    const depth = dot(m, n);
    return PROFILE.map(([d, z]): [number, number, number] => {
      const k = Math.min(d, depth) / depth;
      // Keep the rounded top in order where a jaw end is shallow.
      const kk = d === Infinity ? 1 : Math.min(k, 0.85);
      return [nose[0] + m[0] * kk, nose[1] + m[1] * kk, z];
    });
  };
  const ends = [section(edge.a, edge.backA), section(edge.b, edge.backB)];
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  ends.forEach((points, end) => {
    let along = 0;
    points.forEach((p, k) => {
      if (k) {
        const q = points[k - 1];
        along += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      }
      positions.push(...p);
      uvs.push(end * length, along);
    });
  });
  const count = PROFILE.length;
  for (let k = 0; k < count - 1; k++) {
    index.push(k, count + k, count + k + 1, k, count + k + 1, k + 1);
  }
  // Jaw ends over the hole are closed off with the profile's own outline.
  for (const [end, cap] of [[0, capA], [1, capB]] as const) {
    if (!cap) continue;
    const points = ends[end];
    const base = positions.length / 3;
    const back = points[count - 1];
    const contour = [...points, [back[0], back[1], 0]];
    for (const p of contour) {
      positions.push(...p);
      uvs.push(0, p[2]);
    }
    const flat = contour.map((p) =>
      new Vector2(dot(sub([p[0], p[1]], edge.a), n), p[2])
    );
    for (const [i, j, k] of ShapeUtils.triangulateShape(flat, [])) {
      index.push(base + i, base + j, base + k);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * One wooden rail between two corner pockets, mitered on the diagonals through
 * them, so the grain runs along every rail.
 */
function railShape(
  edges: Edge[][],
  cuts: PocketCut[],
  from: number,
  to: number,
): Shape {
  const l = TABLE.length / 2 + OUTER;
  const w = TABLE.width / 2 + OUTER;
  const corner = (i: number): Point => [
    Math.sign(cuts[i].x) * l,
    Math.sign(cuts[i].y) * w,
  ];
  const points: Point[] = [corner(from)];
  points.push(...arc(cuts[from], cuts[from].axis, cuts[from].leave));
  for (let i = from; i !== to; i = (i + 1) % cuts.length) {
    const [, leave, rail] = edges[i];
    points.push(leave.backA, leave.backB, rail.backB);
    const next = (i + 1) % cuts.length;
    const enter = edges[next][0];
    points.push(enter.backB);
    if (next !== to) {
      points.push(...arc(cuts[next], cuts[next].enter, cuts[next].leave));
    }
  }
  points.push(...arc(cuts[to], cuts[to].enter, cuts[to].axis));
  points.push(corner(to));
  // Arcs end exactly on the jaws' backs; drop the repeated points.
  const unique = points.filter((p, i) =>
    !i || Math.hypot(...sub(p, points[i - 1])) > 1e-6
  );
  return new Shape(unique.map(([x, y]) => new Vector2(x, y)));
}

/** The leather wall and rim lining a pocket's cut through the rail. */
function pocketLiner(cut: PocketCut, material: MeshStandardMaterial) {
  const group = new Group();
  const ring = arc(cut, cut.enter, cut.leave, cut.radius - 0.0006);
  const positions: number[] = [];
  const index: number[] = [];
  ring.forEach(([x, y], i) => {
    positions.push(x, y, -0.02, x, y, RAIL_TOP + 0.0015);
    if (i) {
      index.push(2 * i - 2, 2 * i, 2 * i + 1, 2 * i - 2, 2 * i + 1, 2 * i - 1);
    }
  });
  const wall = new BufferGeometry();
  wall.setAttribute("position", new Float32BufferAttribute(positions, 3));
  wall.setIndex(index);
  wall.computeVertexNormals();
  group.add(new Mesh(wall, material));
  const rim = new Mesh(
    new RingGeometry(
      cut.radius - 0.001,
      cut.radius + 0.011,
      48,
      1,
      cut.enter,
      ccw(cut.enter, cut.leave),
    ),
    material,
  );
  rim.position.set(cut.x, cut.y, RAIL_TOP + 0.0015);
  rim.receiveShadow = true;
  group.add(rim);
  return group;
}

/** Lays wood grain along each rail, in meters. */
function grainAlong(geometry: BufferGeometry, alongX: boolean) {
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    uv.setXY(i, (alongX ? x : y) / 1.4, ((alongX ? y : x) + z) / 0.35);
  }
  uv.needsUpdate = true;
}

/**
 * The visible cushion noses are built from the simulation's exact segments,
 * and the cloth's pocket holes from its pocket circles.
 */
export function createTable(anisotropy = 1): Group {
  const group = new Group();
  const l = TABLE.length / 2;
  const w = TABLE.width / 2;
  const grain = woodTexture();
  grain.anisotropy = anisotropy;
  const wood = new MeshPhysicalMaterial({
    map: grain,
    roughness: 0.62,
    clearcoat: 0.3,
    clearcoatRoughness: 0.32,
  });
  const weave = clothTexture();
  weave.anisotropy = anisotropy;
  const felt = new MeshStandardMaterial({
    color: 0x1a7d58,
    map: weave,
    roughness: 0.94,
  });
  // The same cloth, a shade deeper, so the cushion line reads at a glance.
  const cushionFelt = new MeshStandardMaterial({
    color: 0x16704f,
    map: weave,
    roughness: 0.9,
    side: DoubleSide,
  });
  const leather = new MeshStandardMaterial({
    color: 0x17110d,
    roughness: 0.7,
    side: DoubleSide,
  });
  const hole = new MeshStandardMaterial({
    color: 0x030303,
    roughness: 1,
    side: DoubleSide,
  });
  const pearl = new MeshPhysicalMaterial({
    color: 0xf3ecdc,
    roughness: 0.2,
    clearcoat: 1,
    iridescence: 0.6,
  });

  const { edges, cuts } = outline();

  // The cloth runs under the rails, so its only edges are the pocket holes.
  const cloth = new Shape();
  const reach = OUTER - 0.01;
  cloth.moveTo(-l - reach, -w - reach);
  cloth.lineTo(l + reach, -w - reach);
  cloth.lineTo(l + reach, w + reach);
  cloth.lineTo(-l - reach, w + reach);
  cloth.closePath();
  for (const cut of cuts) {
    const circle = new Path();
    circle.absarc(cut.x, cut.y, cut.radius, 0, TAU, true);
    cloth.holes.push(circle);
  }
  const bed = new Mesh(new ShapeGeometry(cloth, 24), felt);
  bed.receiveShadow = true;
  group.add(bed);

  for (const [enter, leave, rail] of edges) {
    for (
      const geometry of [
        cushionGeometry(enter, false, true),
        cushionGeometry(leave, true, false),
        cushionGeometry(rail, false, false),
      ]
    ) {
      const cushion = new Mesh(geometry, cushionFelt);
      cushion.castShadow = cushion.receiveShadow = true;
      group.add(cushion);
    }
  }

  // Corner pockets, counterclockwise from the bottom left, and the rail
  // between each pair.
  const corners = [0, 2, 3, 5];
  corners.forEach((from, i) => {
    const to = corners[(i + 1) % corners.length];
    const bevel = 0.007;
    const geometry = new ExtrudeGeometry(railShape(edges, cuts, from, to), {
      depth: RAIL_THICKNESS - 2 * bevel,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelOffset: -bevel,
      bevelSegments: 4,
      curveSegments: 1,
    });
    geometry.translate(0, 0, RAIL_TOP - RAIL_THICKNESS + bevel);
    grainAlong(geometry, i % 2 === 0);
    const rail = new Mesh(geometry, wood);
    rail.castShadow = rail.receiveShadow = true;
    group.add(rail);
  });

  for (const [i, p] of TABLE.pockets.entries()) {
    group.add(pocketLiner(cuts[i], leather));
    const well = new Mesh(
      new CylinderGeometry(cuts[i].radius, p.radius * 0.85, 0.16, 32, 1, true),
      hole,
    );
    well.rotation.x = Math.PI / 2;
    well.position.set(p.x, p.y, -0.08);
    group.add(well);
    const bottom = new Mesh(new CircleGeometry(p.radius * 0.85, 32), hole);
    bottom.position.set(p.x, p.y, -0.16);
    group.add(bottom);
  }

  // Inlaid diamonds, centered on the rail tops.
  const sightGeometry = new CircleGeometry(0.0075, 4);
  const inset = CUSHION_DEPTH + RAIL_WIDTH / 2;
  const sight = (x: number, y: number, alongX: boolean) => {
    const mesh = new Mesh(sightGeometry, pearl);
    mesh.scale.set(alongX ? 1.5 : 0.75, alongX ? 0.75 : 1.5, 1);
    mesh.position.set(x, y, RAIL_TOP + 0.0004);
    group.add(mesh);
  };
  for (const k of [1, 2, 3, 5, 6, 7]) {
    sight(-l + k * TABLE.length / 8, w + inset, true);
    sight(-l + k * TABLE.length / 8, -w - inset, true);
  }
  for (const k of [-1, 0, 1]) {
    sight(-l - inset, k * TABLE.width / 4, false);
    sight(l + inset, k * TABLE.width / 4, false);
  }
  const spotMaterial = new MeshStandardMaterial({
    color: 0xd8ded0,
    roughness: 1,
  });
  for (const x of [-TABLE.length / 4, TABLE.length / 4]) {
    const spot = new Mesh(new CircleGeometry(0.004, 16), spotMaterial);
    spot.position.set(x, 0, 0.0006);
    group.add(spot);
  }

  // The body under the rails: a slightly inset apron, then the legs.
  const apronTop = RAIL_TOP - RAIL_THICKNESS;
  const apronHeight = 0.17;
  const apronInset = 0.018;
  for (const alongX of [true, false]) {
    for (const side of [-1, 1]) {
      const length = alongX
        ? 2 * (l + OUTER - apronInset)
        : 2 * (w + OUTER - apronInset) - 0.08;
      const apron = new Mesh(
        new BoxGeometry(
          alongX ? length : 0.04,
          alongX ? 0.04 : length,
          apronHeight,
        ),
        wood,
      );
      const offset = (alongX ? w : l) + OUTER - apronInset - 0.02;
      apron.position.set(
        alongX ? 0 : side * offset,
        alongX ? side * offset : 0,
        apronTop - apronHeight / 2,
      );
      grainAlong(apron.geometry, alongX);
      apron.castShadow = apron.receiveShadow = true;
      group.add(apron);
    }
  }
  const legHeight = apronTop - apronHeight - FLOOR;
  for (const x of [-l + 0.06, 0, l - 0.06]) {
    for (const y of [-w - 0.05, w + 0.05]) {
      // Square, tapering toward the floor.
      const leg = new Mesh(
        new CylinderGeometry(0.085, 0.06, legHeight, 4),
        wood,
      );
      leg.rotation.set(Math.PI / 2, Math.PI / 4, 0);
      leg.position.set(x, y, FLOOR + legHeight / 2);
      leg.castShadow = true;
      group.add(leg);
    }
  }
  return group;
}
