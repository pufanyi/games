import {
  ACESFilmicToneMapping,
  BoxGeometry,
  type BufferGeometry,
  Color,
  DirectionalLight,
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
import type { Session } from "../runtime/session.ts";
import { Balls } from "./balls.ts";
import { type CameraView, TableCamera } from "./camera.ts";
import { Cue } from "./cue.ts";
import { Guide } from "./guide.ts";
import { createTable } from "./table.ts";

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
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.scene.background = new Color(0x101816);
    this.scene.add(
      createTable(),
      this.balls.group,
      this.cue.group,
      this.guide.group,
    );
    this.scene.add(new HemisphereLight(0xdce9ef, 0x3b3024, 1.2));
    const key = new DirectionalLight(0xfff3da, 1.8);
    key.position.set(-1.2, -0.8, 3.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, {
      left: -1.8,
      right: 1.8,
      top: 1.2,
      bottom: -1.2,
      near: 0.1,
      far: 8,
    });
    key.shadow.normalBias = 0.004;
    key.shadow.bias = -0.00003;
    this.scene.add(key);
    const fill = new DirectionalLight(0xc7e1ff, 0.7);
    fill.position.set(1.5, 1, 2);
    this.scene.add(fill);
    for (const x of [-0.7, 0.7]) {
      const lamp = new SpotLight(0xfff5dd, 12, 5, Math.PI / 3, 0.9, 2);
      lamp.position.set(x, 0, 1.8);
      lamp.target.position.set(x, 0, 0);
      this.scene.add(lamp, lamp.target);
    }
    const floor = new Mesh(
      new PlaneGeometry(30, 30),
      new MeshStandardMaterial({ color: 0x070b09, roughness: 0.95 }),
    );
    floor.position.z = -0.85;
    floor.receiveShadow = false;
    this.scene.add(floor);

    // A small procedural studio supplies reflections without network HDR assets.
    const studio = new Scene();
    studio.background = new Color(0x303c39);
    for (const x of [-1, 1]) {
      const panel = new Mesh(
        new BoxGeometry(2.4, 0.4, 0.02),
        new MeshBasicMaterial({ color: 0xffffff }),
      );
      panel.position.set(x, 0, 2);
      studio.add(panel);
    }
    const pmrem = new PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(studio, 0.04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.6;
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
  }

  setView(view: CameraView) {
    this.camera.view = view;
  }

  draw(session: Session, dt: number) {
    this.balls.update(session.game, dt);
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
