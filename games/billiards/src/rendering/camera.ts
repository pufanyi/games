import {
  OrthographicCamera,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from "three";
import { BALL_RADIUS as R } from "../physics/constants.ts";
import { TABLE } from "../physics/table.ts";
import type { Session } from "../runtime/session.ts";

export type CameraView = "cue" | "top";

/**
 * An orbit around a pivot on the table: the eye sits `distance` back from the
 * pivot against `azimuth`, `pitch` above the cloth, and looks `ahead` past it.
 */
export interface Pose {
  x: number;
  y: number;
  z: number;
  azimuth: number;
  pitch: number;
  distance: number;
  ahead: number;
}

const DEGREE = Math.PI / 180;
export const MIN_PITCH = 6 * DEGREE;
export const MAX_PITCH = 80 * DEGREE;
const MIN_DISTANCE = 0.45;
const MAX_DISTANCE = 2.4;
/** How long the cue view holds on the strike before rising to the table. */
const FOLLOW_SECONDS = 0.7;
const OVERVIEW_PITCH = 56 * DEGREE;
/** Where the table must fit on screen: clear of the HUD and side columns. */
const FIT_X = 0.84;
const FIT_Y = 0.72;

const TAU = Math.PI * 2;
const wrap = (angle: number) => ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;

/** Both cameras use the physics axes: x along the table, y across, z up. */
export class TableCamera {
  readonly top = new OrthographicCamera(-1.7, 1.7, 0.96, -0.96, 0.01, 20);
  readonly perspective = new PerspectiveCamera(40, 16 / 9, 0.02, 30);
  private readonly ray = new Raycaster();
  private readonly plane = new Plane(new Vector3(0, 0, 1), -R);
  private readonly point = new Vector3();
  private readonly pointer = new Vector2();
  private pose: Pose | null = null;
  private target: Pose | null = null;
  private following = false;
  /** Seconds since the camera switched between the cue view and overview. */
  private settling = 0;
  private overviewDistance = 0;
  view: CameraView = "cue";
  /** The player's own framing of the cue view. */
  pitch = 19 * DEGREE;
  distance = 1.0;

  constructor() {
    this.top.position.set(0, 0.15, 5);
    this.top.up.set(0, 1, 0);
    this.top.lookAt(0, 0.15, 0);
    this.top.updateMatrixWorld();
    this.perspective.up.set(0, 0, 1);
    this.overviewDistance = this.fitOverview();
  }

  get active() {
    return this.view === "top" ? this.top : this.perspective;
  }

  setAspect(aspect: number) {
    if (!(aspect > 0) || aspect === this.perspective.aspect) return;
    this.perspective.aspect = aspect;
    this.perspective.updateProjectionMatrix();
    this.overviewDistance = this.fitOverview();
  }

  /** Drags the cue view up or down, in radians of pitch. */
  tilt(radians: number) {
    this.pitch = Math.min(Math.max(this.pitch + radians, MIN_PITCH), MAX_PITCH);
  }

  /** Moves the cue view nearer (factor < 1) or farther. */
  zoom(factor: number) {
    this.distance = Math.min(
      Math.max(this.distance * factor, MIN_DISTANCE),
      MAX_DISTANCE,
    );
  }

  /** The whole table, from the long side nearer the shooter. */
  overview(aim: number): Pose {
    return {
      x: 0,
      y: 0,
      z: 0,
      azimuth: Math.sin(aim) < 0 ? -Math.PI / 2 : Math.PI / 2,
      pitch: OVERVIEW_PITCH,
      distance: this.overviewDistance,
      ahead: 0,
    };
  }

  /** Low behind the cue ball, looking down the aim line. */
  behindCue(session: Session): Pose {
    const cue = session.game.balls[0];
    // A raised cue would otherwise come up through the camera.
    const raised = (session.elevation + 10) * DEGREE;
    return {
      x: cue.x,
      y: cue.y,
      z: R,
      azimuth: session.aim,
      pitch: Math.max(this.pitch, raised),
      distance: this.distance,
      ahead: 1.1 * Math.cos(this.pitch),
    };
  }

  /** Where the cue view wants to be for what's happening on the table. */
  desired(session: Session): Pose {
    const { game } = session;
    if (session.mode === "game" && game.phase === "aiming") {
      return this.behindCue(session);
    }
    if (
      game.phase === "rolling" && game.playback &&
      game.playback.t < FOLLOW_SECONDS && this.target
    ) {
      return this.target;
    }
    return this.overview(session.aim);
  }

  /** Eases toward the desired pose; `dt` of Infinity snaps to it. */
  update(session: Session, dt: number) {
    const target = this.desired(session);
    const following = target.ahead > 0;
    if (following !== this.following) this.settling = 0;
    this.following = following;
    this.settling += dt;
    this.target = target;
    if (!this.pose || dt === Infinity) {
      this.pose = { ...target };
    } else {
      // Transitions start slowly, then aim changes are followed closely.
      const rate = Math.min(3 + this.settling * 30, 24);
      const k = 1 - Math.exp(-rate * dt);
      const p = this.pose;
      p.x += (target.x - p.x) * k;
      p.y += (target.y - p.y) * k;
      p.z += (target.z - p.z) * k;
      p.azimuth = wrap(p.azimuth + wrap(target.azimuth - p.azimuth) * k);
      p.pitch += (target.pitch - p.pitch) * k;
      p.distance += (target.distance - p.distance) * k;
      p.ahead += (target.ahead - p.ahead) * k;
    }
    place(this.perspective, this.pose);
  }

  /** Normalized device coordinates, independent of CSS size and pixel ratio. */
  toTable(nx: number, ny: number): [number, number] | null {
    this.pointer.set(nx, ny);
    this.ray.setFromCamera(this.pointer, this.active);
    if (!this.ray.ray.intersectPlane(this.plane, this.point)) return null;
    return [this.point.x, this.point.y];
  }

  /** The nearest distance at which the overview shows the whole table. */
  private fitOverview(): number {
    const camera = this.perspective.clone();
    const l = TABLE.length / 2 + 0.17;
    const w = TABLE.width / 2 + 0.17;
    const corner = new Vector3();
    const fits = (distance: number) => {
      place(camera, { ...this.overview(0), distance });
      for (const [x, y] of [[-l, -w], [l, -w], [l, w], [-l, w]]) {
        corner.set(x, y, 0.05).project(camera);
        if (Math.abs(corner.x) > FIT_X || Math.abs(corner.y) > FIT_Y) {
          return false;
        }
      }
      return true;
    };
    let near = 1;
    let far = 12;
    for (let i = 0; i < 30; i++) {
      const mid = (near + far) / 2;
      if (fits(mid)) far = mid;
      else near = mid;
    }
    return far;
  }
}

export function eye(pose: Pose): [number, number, number] {
  const dx = Math.cos(pose.azimuth);
  const dy = Math.sin(pose.azimuth);
  const back = pose.distance * Math.cos(pose.pitch);
  return [
    pose.x - dx * back,
    pose.y - dy * back,
    pose.z + pose.distance * Math.sin(pose.pitch),
  ];
}

function place(camera: PerspectiveCamera, pose: Pose) {
  camera.position.set(...eye(pose));
  camera.lookAt(
    pose.x + Math.cos(pose.azimuth) * pose.ahead,
    pose.y + Math.sin(pose.azimuth) * pose.ahead,
    0,
  );
  camera.updateMatrixWorld();
}
