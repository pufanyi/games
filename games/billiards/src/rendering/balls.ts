import {
  Group,
  Mesh,
  MeshPhysicalMaterial,
  Quaternion,
  SphereGeometry,
} from "three";
import { type Game, poses } from "../game/game.ts";
import { BALL_RADIUS as R } from "../physics/constants.ts";
import { TABLE } from "../physics/table.ts";
import { type Quat, randomQuat, spin } from "./orientation.ts";
import { ballTexture } from "./textures.ts";

export class Balls {
  readonly group = new Group();
  private readonly meshes: Mesh<SphereGeometry, MeshPhysicalMaterial>[] = [];
  private readonly orientations: Quat[] = [];
  private readonly falling = new Map<number, number>();
  private game: Game | null = null;

  constructor() {
    const geometry = new SphereGeometry(R, 32, 24);
    for (let id = 0; id < 16; id++) {
      const mesh = new Mesh(
        geometry,
        new MeshPhysicalMaterial({
          map: ballTexture(id),
          roughness: 0.19,
          metalness: 0,
          clearcoat: 1,
          clearcoatRoughness: 0.12,
        }),
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
  }

  update(game: Game, dt: number) {
    if (game !== this.game) {
      this.game = game;
      this.falling.clear();
      for (const ball of game.balls) {
        this.orientations[ball.id] = randomQuat(Math.random);
      }
    }
    const current = poses(game);
    game.balls.forEach((ball, i) => {
      const mesh = this.meshes[ball.id];
      const pose = current[i];
      if (pose.pocketed) {
        const elapsed = (this.falling.get(ball.id) ?? 0) + dt;
        this.falling.set(ball.id, elapsed);
        mesh.visible = elapsed < 0.35;
        if (mesh.visible) {
          const pocket = TABLE.pockets.reduce((best, p) =>
            Math.hypot(p.x - pose.x, p.y - pose.y) <
                Math.hypot(best.x - pose.x, best.y - pose.y)
              ? p
              : best
          );
          const blend = Math.min(elapsed / 0.15, 1);
          mesh.position.set(
            pose.x + (pocket.x - pose.x) * blend,
            pose.y + (pocket.y - pose.y) * blend,
            R - 2.5 * elapsed * elapsed,
          );
        }
      } else {
        this.falling.delete(ball.id);
        mesh.visible = true;
        mesh.position.set(pose.x, pose.y, R);
        const q = spin(
          this.orientations[ball.id],
          pose.wx,
          pose.wy,
          pose.wz,
          game.playback ? dt : 0,
        );
        this.orientations[ball.id] = q;
        mesh.quaternion.copy(new Quaternion(q[1], q[2], q[3], q[0]));
      }
    });
  }
}
