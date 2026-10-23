import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { BALL_RADIUS as R } from "../physics/constants.ts";
import type { Session } from "../runtime/session.ts";

export class Cue {
  readonly group = new Group();
  private readonly direction = new Vector3();
  private readonly axis = new Vector3(0, 1, 0);

  constructor() {
    const section = (
      start: number,
      length: number,
      tip: number,
      butt: number,
      color: number,
    ) => {
      const mesh = new Mesh(
        new CylinderGeometry(butt, tip, length, 16),
        new MeshStandardMaterial({ color, roughness: 0.3 }),
      );
      mesh.position.y = start + length / 2;
      mesh.castShadow = true;
      this.group.add(mesh);
    };
    section(0, 0.007, 0.0063, 0.0063, 0x397d9b);
    section(0.007, 0.022, 0.0064, 0.0065, 0xf1eadb);
    section(0.029, 0.79, 0.0065, 0.011, 0xd9b77f);
    section(0.819, 0.025, 0.011, 0.011, 0xc5b997);
    section(0.844, 0.45, 0.011, 0.014, 0x35221c);
    section(1.294, 0.12, 0.014, 0.015, 0x17191b);
    section(1.294 + 0.12, 0.036, 0.015, 0.015, 0x9e8252);
  }

  update(session: Session) {
    this.group.visible = session.mode === "game" &&
      session.game.phase === "aiming" && !session.paused;
    if (!this.group.visible) return;
    const ball = session.game.balls[0];
    const dx = Math.cos(session.aim);
    const dy = Math.sin(session.aim);
    const elevation = session.elevation * Math.PI / 180;
    const c = Math.cos(elevation);
    const s = Math.sin(elevation);
    const [side, up] = session.tip;
    const contact = Math.sqrt(1 - side * side - up * up) * R;
    const pull = 0.012 + (session.pulling ? session.power * 0.22 : 0);
    this.direction.set(-dx * c, -dy * c, s);
    this.group.quaternion.setFromUnitVectors(this.axis, this.direction);
    this.group.position.set(
      ball.x + dy * side * R + dx * s * up * R,
      ball.y - dx * side * R + dy * s * up * R,
      R + c * up * R,
    );
    this.group.position.addScaledVector(this.direction, contact + pull);
  }
}
