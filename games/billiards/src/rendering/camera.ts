import {
  OrthographicCamera,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from "three";
import { BALL_RADIUS } from "../physics/constants.ts";

export type CameraView = "table" | "top";

/** Both cameras use the physics axes: x along the table, y across, z up. */
export class TableCamera {
  readonly top = new OrthographicCamera(-1.7, 1.7, 0.96, -0.96, 0.01, 20);
  readonly table = new PerspectiveCamera(32, 16 / 9, 0.01, 30);
  private readonly ray = new Raycaster();
  private readonly plane = new Plane(new Vector3(0, 0, 1), -BALL_RADIUS);
  private readonly point = new Vector3();
  private readonly pointer = new Vector2();
  view: CameraView = "table";

  constructor() {
    this.top.position.set(0, 0.15, 5);
    this.top.up.set(0, 1, 0);
    this.top.lookAt(0, 0.15, 0);
    this.table.position.set(0, -2.25, 3.1);
    this.table.up.set(0, 0, 1);
    this.table.lookAt(0, 0.04, 0);
    this.top.updateMatrixWorld();
    this.table.updateMatrixWorld();
  }

  get active() {
    return this.view === "top" ? this.top : this.table;
  }

  /** Normalized device coordinates, independent of CSS size and pixel ratio. */
  toTable(nx: number, ny: number): [number, number] | null {
    this.pointer.set(nx, ny);
    this.ray.setFromCamera(this.pointer, this.active);
    if (!this.ray.ray.intersectPlane(this.plane, this.point)) return null;
    return [this.point.x, this.point.y];
  }
}
