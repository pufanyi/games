import {
  ACESFilmicToneMapping,
  BoxGeometry,
  type BufferGeometry,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Line,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFShadowMap,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SpotLight,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
} from "three";
import { HEIGHT, WIDTH } from "./layout.ts";
import { isActive, type Session } from "../runtime/session.ts";
import { Balls } from "./balls.ts";
import { type CameraView, TableCamera } from "./camera.ts";
import { Cue } from "./cue.ts";
import { Guide } from "./guide.ts";
import { createTable, FLOOR } from "./table.ts";

export class Renderer {
  readonly camera = new TableCamera();
  private readonly scene = new Scene();
  private readonly renderer: WebGLRenderer;
  private readonly balls = new Balls();
  private readonly cue = new Cue();
  private readonly guide = new Guide();
  private readonly environment;
  private readonly resize: ResizeObserver;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.scene.background = new Color(0x0d0b09);
    this.scene.fog = new Fog(0x0d0b09, 4, 11);
    this.scene.add(
      createTable(this.renderer.capabilities.getMaxAnisotropy()),
      this.balls.group,
      this.cue.group,
      this.guide.group,
    );
    this.scene.add(new HemisphereLight(0xd9e4e8, 0x2a2018, 0.75));
    // The lamp over the table: a key from nearly overhead, so balls sit on
    // their shadows, and two pools of light that fall off toward the rails.
    const key = new DirectionalLight(0xfff1dc, 1.5);
    key.position.set(0.5, -0.7, 2.8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, {
      left: -1.75,
      right: 1.75,
      top: 1.1,
      bottom: -1.1,
      near: 1,
      far: 4.5,
    });
    key.shadow.radius = 3;
    key.shadow.normalBias = 0.002;
    key.shadow.bias = -0.0002;
    this.scene.add(key);
    for (const x of [-0.75, 0.75]) {
      const lamp = new SpotLight(0xffefd2, 5, 4, Math.PI / 3.2, 0.85, 2);
      lamp.position.set(x, 0, 1.25);
      lamp.target.position.set(x, 0, 0);
      this.scene.add(lamp, lamp.target);
    }
    const floor = new Mesh(
      new PlaneGeometry(30, 30),
      new MeshStandardMaterial({ color: 0x1c140f, roughness: 0.95 }),
    );
    floor.position.z = FLOOR;
    this.scene.add(floor);

    // A small procedural pool hall supplies reflections without network HDR
    // assets: the long lamp overhead and a few dim walls.
    const studio = new Scene();
    studio.background = new Color(0x1d1a17);
    const panel = (
      w: number,
      h: number,
      x: number,
      y: number,
      z: number,
      color: number,
    ) => {
      const mesh = new Mesh(
        new BoxGeometry(w, h, 0.02),
        new MeshBasicMaterial({ color }),
      );
      mesh.position.set(x, y, z);
      studio.add(mesh);
      return mesh;
    };
    panel(2.2, 0.35, 0, 0, 1.4, 0xffffff);
    for (const y of [-3, 3]) {
      panel(6, 2, 0, y, 0.6, 0x4a3b2c).rotation.x = Math.PI / 2;
    }
    const pmrem = new PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(studio, 0.03);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();
    disposeScene(studio);

    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(canvas);
    this.fit();
  }

  private fit() {
    const width = this.canvas.clientWidth || WIDTH;
    const height = this.canvas.clientHeight || HEIGHT;
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.setAspect(width / height);
  }

  setView(view: CameraView) {
    this.camera.view = view;
  }

  /** `dt` is real time; balls only spin while the game runs. */
  draw(session: Session, dt: number) {
    this.camera.update(session, dt);
    this.balls.update(session.game, isActive(session) ? dt : 0);
    this.cue.update(session);
    this.guide.update(session);
    this.renderer.render(this.scene, this.camera.active);
  }

  dispose() {
    this.resize.disconnect();
    disposeScene(this.scene);
    this.environment.dispose();
    this.renderer.dispose();
  }
}

function disposeScene(scene: Scene) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  // Materials and geometry are shared by balls and rail sights.
  const textures = new Set<Texture>();
  scene.traverse((object) => {
    if (object instanceof DirectionalLight) object.shadow.dispose();
    if (!(object instanceof Mesh) && !(object instanceof Line)) return;
    geometries.add(object.geometry);
    for (
      const material of Array.isArray(object.material)
        ? object.material
        : [object.material]
    ) {
      for (const value of Object.values(material)) {
        if (value instanceof Texture) textures.add(value);
      }
      materials.add(material);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
}
