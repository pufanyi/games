import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Path,
  Shape,
  ShapeGeometry,
} from "three";
import { CUSHION_HEIGHT } from "../physics/constants.ts";
import { TABLE } from "../physics/table.ts";
import { clothTexture, pocketMask, woodTexture } from "./textures.ts";

/** The visible cushion noses are built from the simulation's exact segments. */
export function createTable(): Group {
  const group = new Group();
  const l = TABLE.length / 2;
  const w = TABLE.width / 2;
  const wood = new MeshStandardMaterial({
    map: woodTexture(),
    roughness: 0.28,
    metalness: 0.05,
  });
  const felt = new MeshStandardMaterial({
    color: 0x167b60,
    map: clothTexture(),
    alphaMap: pocketMask(),
    alphaTest: 0.5,
    roughness: 0.96,
  });
  const rubber = new MeshStandardMaterial({ color: 0x125b43, roughness: 0.85 });
  const brass = new MeshStandardMaterial({
    color: 0x9d824e,
    roughness: 0.3,
    metalness: 0.75,
  });
  const dark = new MeshStandardMaterial({
    color: 0x090b09,
    roughness: 0.95,
    side: DoubleSide,
  });

  for (const [i, c] of TABLE.cushions.entries()) {
    if (i % 3 !== 2) continue;
    const dx = c.bx - c.ax;
    const dy = c.by - c.ay;
    const length = Math.hypot(dx, dy);
    const cx = (c.ax + c.bx) / 2;
    const cy = (c.ay + c.by) / 2;
    const sign = (-dy * cx + dx * cy) > 0 ? 1 : -1;
    const rail = new Mesh(new BoxGeometry(length + 0.025, 0.14, 0.22), wood);
    rail.rotation.z = Math.atan2(dy, dx);
    rail.position.set(
      cx - sign * dy / length * 0.07,
      cy + sign * dx / length * 0.07,
      -0.085,
    );
    rail.castShadow = rail.receiveShadow = true;
    group.add(rail);
  }

  const cloth = new Shape();
  // Follow each mouth's two jaws and the straight rail to the next pocket.
  const points = TABLE.cushions.flatMap((c, i) =>
    i % 3 === 0
      ? [[c.ax, c.ay], [c.bx, c.by]]
      : i % 3 === 1
      ? [[c.bx, c.by], [c.ax, c.ay]]
      : []
  );
  points.forEach(([x, y], i) => {
    if (i) cloth.lineTo(x, y);
    else cloth.moveTo(x, y);
  });
  cloth.closePath();
  const bed = new Mesh(new ShapeGeometry(cloth), felt);
  bed.receiveShadow = true;
  group.add(bed);

  for (const c of TABLE.cushions) {
    const dx = c.bx - c.ax;
    const dy = c.by - c.ay;
    const length = Math.hypot(dx, dy);
    // Choose the normal pointing away from the playing surface.
    let nx = -dy / length;
    let ny = dx / length;
    const cx = (c.ax + c.bx) / 2;
    const cy = (c.ay + c.by) / 2;
    if (nx * cx + ny * cy < 0) {
      nx = -nx;
      ny = -ny;
    }
    const width = 0.045;
    const shape = new Shape();
    shape.moveTo(c.ax, c.ay);
    shape.lineTo(c.bx, c.by);
    shape.lineTo(c.bx + nx * width, c.by + ny * width);
    shape.lineTo(c.ax + nx * width, c.ay + ny * width);
    shape.closePath();
    const cushion = new Mesh(
      new ExtrudeGeometry(shape, {
        depth: CUSHION_HEIGHT,
        bevelEnabled: false,
        steps: 1,
      }),
      rubber,
    );
    cushion.castShadow = cushion.receiveShadow = true;
    group.add(cushion);
  }

  for (const p of TABLE.pockets) {
    const well = new Mesh(
      new CylinderGeometry(p.radius, p.radius * 0.8, 0.16, 32, 1, true),
      dark,
    );
    well.rotation.x = Math.PI / 2;
    well.position.set(p.x, p.y, -0.08);
    group.add(well);
    const bottom = new Mesh(new CircleGeometry(p.radius * 0.8, 32), dark);
    bottom.position.set(p.x, p.y, -0.16);
    group.add(bottom);
    const lip = new Shape();
    lip.absarc(0, 0, p.radius + 0.022, 0, Math.PI * 2, false);
    const hole = new Path();
    hole.absarc(0, 0, p.radius, 0, Math.PI * 2, true);
    lip.holes.push(hole);
    const rim = new Mesh(
      new ExtrudeGeometry(lip, {
        depth: 0.022,
        bevelEnabled: true,
        bevelSize: 0.002,
        bevelThickness: 0.002,
        bevelSegments: 2,
        steps: 1,
      }),
      dark,
    );
    rim.position.set(p.x, p.y, 0.002);
    group.add(rim);
  }

  const sightGeometry = new CircleGeometry(0.006, 4);
  const sight = (x: number, y: number) => {
    const mesh = new Mesh(sightGeometry, brass);
    mesh.position.set(x, y, 0.027);
    group.add(mesh);
  };
  for (const k of [1, 2, 3, 5, 6, 7]) {
    sight(-l + k * TABLE.length / 8, w + 0.095);
    sight(-l + k * TABLE.length / 8, -w - 0.095);
  }
  for (const k of [-1, 0, 1]) {
    sight(-l - 0.095, k * TABLE.width / 4);
    sight(l + 0.095, k * TABLE.width / 4);
  }
  const spotMaterial = new MeshStandardMaterial({
    color: 0xd8ded0,
    roughness: 1,
  });
  for (const x of [-TABLE.length / 4, TABLE.length / 4]) {
    const spot = new Mesh(new CircleGeometry(0.003, 16), spotMaterial);
    spot.position.set(x, 0, 0.001);
    group.add(spot);
  }
  for (const x of [-l + 0.2, l - 0.2]) {
    for (const y of [-w + 0.1, w - 0.1]) {
      const leg = new Mesh(new BoxGeometry(0.12, 0.12, 0.65), wood);
      leg.position.set(x, y, -0.51);
      leg.castShadow = true;
      group.add(leg);
    }
  }
  return group;
}
