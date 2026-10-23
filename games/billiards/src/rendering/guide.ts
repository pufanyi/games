import {
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Vector3,
} from "three";
import { aimGuide } from "../aim.ts";
import { canPlace } from "../game.ts";
import { BALL_RADIUS as R } from "../physics/constants.ts";
import { TABLE } from "../physics/table.ts";
import type { Session } from "../session.ts";

export class Guide {
  readonly group = new Group();
  private readonly aim = this.line(0xe6e9dd, 0.55, true);
  private readonly object = this.line(0xffffff, 0.75);
  private readonly tangent = this.line(0xffffff, 0.3);
  private readonly head = this.line(0xffffff, 0.35, true);
  private readonly ring = new Mesh(
    new RingGeometry(R, R + 0.0018, 48),
    new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    }),
  );

  constructor() {
    this.group.add(this.ring);
    this.segment(
      this.head,
      -TABLE.length / 4,
      -TABLE.width / 2,
      -TABLE.length / 4,
      TABLE.width / 2,
      0.002,
    );
  }

  private line(color: number, opacity: number, dashed = false) {
    const geometry = new BufferGeometry().setFromPoints([
      new Vector3(),
      new Vector3(),
    ]);
    const options = { color, opacity, transparent: true, depthWrite: false };
    const material = dashed
      ? new LineDashedMaterial({ ...options, dashSize: 0.02, gapSize: 0.015 })
      : new LineBasicMaterial(options);
    const line = new Line(geometry, material);
    this.group.add(line);
    return line;
  }

  private segment(
    line: Line,
    x: number,
    y: number,
    tx: number,
    ty: number,
    z = R,
  ) {
    const positions = line.geometry.getAttribute("position");
    positions.setXYZ(0, x, y, z);
    positions.setXYZ(1, tx, ty, z);
    positions.needsUpdate = true;
    line.geometry.computeBoundingSphere();
    line.computeLineDistances();
  }

  update(session: Session) {
    const { game } = session;
    const cue = game.balls[0];
    const placing = session.mode === "game" && game.phase === "placing";
    const aiming = session.mode === "game" && game.phase === "aiming" &&
      !session.paused;
    this.aim.visible = aiming;
    this.head.visible = placing && game.area === "kitchen";
    this.ring.visible = placing || aiming;
    this.object.visible = this.tangent.visible = false;
    this.ring.material.color.set(
      placing && !canPlace(game) ? 0xff4b46 : 0xffffff,
    );
    this.ring.position.set(cue.x, cue.y, 0.003);
    if (!aiming) return;
    const guide = aimGuide(
      game.balls,
      Math.cos(session.aim),
      Math.sin(session.aim),
    );
    this.segment(this.aim, cue.x, cue.y, guide.x, guide.y);
    this.ring.position.set(guide.x, guide.y, 0.003);
    if (guide.target) {
      this.object.visible = this.tangent.visible = true;
      this.segment(
        this.object,
        guide.target.x,
        guide.target.y,
        guide.target.x + guide.objectX * 0.35,
        guide.target.y + guide.objectY * 0.35,
      );
      this.segment(
        this.tangent,
        guide.x,
        guide.y,
        guide.x + guide.cueX * 0.25,
        guide.y + guide.cueY * 0.25,
      );
    }
  }
}
