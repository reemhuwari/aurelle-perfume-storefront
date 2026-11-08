import { AfterViewInit, Component, ElementRef, EventEmitter, NgZone, OnDestroy, Output, inject, input, viewChild } from '@angular/core';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MotionService } from '../../../core/services/motion.service';
import { MistCanvas, ScentKind } from '../mist-canvas/mist-canvas';
import type { BottleStoryPose } from '../hero-bottle-display/hero-bottle-display';

const NOZZLE_LOCAL = new THREE.Vector3(0.19, 0.03, 0.3);
const EMPTY_POSE: BottleStoryPose = { x: 0, y: 0, scale: 1, rotation: 0 };

interface ScreenQuad {
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  p4: { x: number; y: number };
}

type QuadCanvas = HTMLCanvasElement & { getBoxQuads?: () => ScreenQuad[]; };

@Component({
  selector: 'app-hero-bottle-3d',
  standalone: true,
  template: '<canvas #canvas aria-label="AURELLE perfume bottle"></canvas>',
  styles: [`
    :host{position:absolute;left:calc(50% - 50vw);top:calc(50% - 50svh);display:block;width:100vw;height:100svh;pointer-events:none}
    canvas{position:absolute;inset:0;display:block;width:100%;height:100%}
  `]
})
export class HeroBottle3D implements AfterViewInit, OnDestroy {
  @Output() readonly initializationFailed = new EventEmitter<Error>();
  mistCanvas = input.required<MistCanvas>();
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private zone = inject(NgZone);
  private motion = inject(MotionService);
  private renderer?: THREE.WebGLRenderer;
  private environmentTarget?: THREE.WebGLRenderTarget;
  private environment?: RoomEnvironment;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  private storyGroup = new THREE.Group();
  private bottleGroup = new THREE.Group();
  private pumpHead = new THREE.Group();
  private labelTexture?: THREE.CanvasTexture;
  private labelCanvas?: HTMLCanvasElement;
  private model?: THREE.Group;
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private frame = 0;
  private lastFrame = 0;
  private elapsed = 0;
  private visible = false;
  private pageVisible = !document.hidden;
  private destroyed = false;
  private canHover = false;
  private pointerX = 0;
  private pointerY = 0;
  private targetPointerX = 0;
  private targetPointerY = 0;
  private pose: BottleStoryPose = { ...EMPTY_POSE };
  private mediaQuery?: MediaQueryList;
  private pumpTimeline?: gsap.core.Timeline;
  private pendingSpray?: ScentKind;
  private backdropGeometry?: THREE.BufferGeometry;
  private labelGeometry?: THREE.BufferGeometry;
  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly materials = new Set<THREE.Material>();
  private readonly textures = new Set<THREE.Texture>();

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      try {
        this.initializeRenderer();
        this.initializeEnvironment();
        this.addLights();
        this.addSceneBacking();
        this.addPumpHead();
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.host);
        this.intersectionObserver = new IntersectionObserver(entries => {
          this.visible = entries[0]?.isIntersecting ?? false;
          this.updateFrameLoop();
        });
        this.intersectionObserver.observe(this.host);
        document.addEventListener('visibilitychange', this.onVisibilityChange);
        this.mediaQuery = matchMedia('(hover: hover) and (pointer: fine)');
        this.canHover = this.mediaQuery.matches;
        if (this.canHover) window.addEventListener('pointermove', this.onPointerMove, { passive: true });
        this.canvas().nativeElement.addEventListener('webglcontextlost', this.onContextLost);
        this.resize();
        void this.loadModel();
      } catch (error) {
        this.reportFailure(error);
      }
    });
  }

  setStoryTransform(pose: BottleStoryPose) {
    this.pose.x = pose.x;
    this.pose.y = pose.y;
    this.pose.scale = pose.scale;
    this.pose.rotation = pose.rotation;
  }

  spray(kind: ScentKind = 0) {
    if (!this.model) {
      this.pendingSpray = kind;
      return;
    }
    if (this.motion.reduced || !this.pumpHead.parent) {
      this.emitAtNozzle(kind);
      return;
    }
    if (this.pumpTimeline?.isActive()) return;

    const startY = 2.42;
    this.pumpTimeline = gsap.timeline({ onComplete: () => this.emitAtNozzle(kind) })
      .to(this.pumpHead.position, { y: startY - 0.13, duration: 0.12, ease: 'power2.in' })
      .to(this.pumpHead.position, { y: startY + 0.025, duration: 0.2, ease: 'back.out(2.4)' });
  }

  playIntroSequence() { this.spray(0); }

  private initializeRenderer() {
    const canvas = this.canvas().nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setClearColor(0x000000, 0);
    this.camera.position.set(0, 0.1, 8.5);
    this.scene.background = null;
    this.scene.add(this.storyGroup);
    this.storyGroup.add(this.bottleGroup);
  }

  private initializeEnvironment() {
    const renderer = this.renderer;
    if (!renderer) throw new Error('The WebGL renderer was not created.');
    const generator = new THREE.PMREMGenerator(renderer);
    generator.compileEquirectangularShader();
    this.environment = new RoomEnvironment();
    this.environmentTarget = generator.fromScene(this.environment, 0.04);
    this.scene.environment = this.environmentTarget.texture;
    generator.dispose();
  }

  private addLights() {
    const key = new THREE.DirectionalLight(0xffe6d5, 4.5);
    key.position.set(-4, 5, 6);
    const rim = new THREE.DirectionalLight(0xf0a4b8, 3.2);
    rim.position.set(4, 1, -3);
    const fill = new THREE.HemisphereLight(0xffecdf, 0x321321, 1.5);
    this.scene.add(key, rim, fill);
  }

  private addSceneBacking() {
    const geometry = new THREE.ShapeGeometry(this.roundedRect(2.08, 2.55, 0.15), 6);
    const material = new THREE.MeshBasicMaterial({ color: '#632b3e', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
    const backing = new THREE.Mesh(geometry, material);
    backing.position.set(0, -0.06, -1.05);
    backing.renderOrder = 0;
    this.bottleGroup.add(backing);
    this.geometries.add(geometry);
    this.materials.add(material);
  }

  private async loadModel() {
    try {
      const gltf: GLTF = await new GLTFLoader().loadAsync('models/bottle.glb');
      if (this.destroyed) {
        this.disposeObject(gltf.scene);
        return;
      }
      this.model = gltf.scene;
      const found = new Set<string>();
      this.model.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        found.add(object.name);
        if (object.name === 'Glass') this.applyGlassMaterial(object);
        if (object.name === 'Liquid') this.applyLiquidMaterial(object);
        if (object.name === 'Cap' || object.name === 'Collar') this.applyGoldMaterial(object);
        object.castShadow = false;
        object.receiveShadow = false;
      });
      for (const requiredName of ['Glass', 'Liquid', 'Cap', 'Collar']) {
        if (!found.has(requiredName)) throw new Error(`The bottle model is missing its ${requiredName} mesh.`);
      }
      this.bottleGroup.add(this.model);
      this.addLabel();
      if (this.pendingSpray !== undefined) {
        const kind = this.pendingSpray;
        this.pendingSpray = undefined;
        this.spray(kind);
      }
      this.updateFrameLoop();
    } catch (error) {
      this.reportFailure(error);
    }
  }

  private applyGlassMaterial(mesh: THREE.Mesh) {
    const material = new THREE.MeshPhysicalMaterial({
      color: '#fffaf8',
      metalness: 0,
      roughness: 0.075,
      transmission: 0.96,
      thickness: 1.45,
      ior: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.11,
      envMapIntensity: 1.8,
      attenuationColor: new THREE.Color('#f8c5d2'),
      attenuationDistance: 3.2
    });
    this.replaceMaterial(mesh, material);
  }

  private applyLiquidMaterial(mesh: THREE.Mesh) {
    const material = new THREE.MeshPhysicalMaterial({
      color: '#ce5477',
      roughness: 0.16,
      metalness: 0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12,
      emissive: '#481323',
      emissiveIntensity: 0.14,
      envMapIntensity: 1.3
    });
    this.replaceMaterial(mesh, material);
  }

  private applyGoldMaterial(mesh: THREE.Mesh) {
    const material = new THREE.MeshStandardMaterial({ color: '#d3a85e', metalness: 1, roughness: 0.25, envMapIntensity: 1.7 });
    this.replaceMaterial(mesh, material);
  }

  private replaceMaterial(mesh: THREE.Mesh, material: THREE.Material) {
    const previous = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    previous.forEach(item => item.dispose());
    mesh.material = material;
    this.materials.add(material);
  }

  private addPumpHead() {
    const metal = new THREE.MeshStandardMaterial({ color: '#d3a85e', metalness: 1, roughness: 0.23, envMapIntensity: 1.8 });
    const dark = new THREE.MeshStandardMaterial({ color: '#211319', metalness: 0.3, roughness: 0.32 });
    const buttonGeometry = new THREE.CylinderGeometry(0.19, 0.22, 0.12, 32, 1);
    const spoutGeometry = new THREE.CylinderGeometry(0.045, 0.06, 0.28, 20, 1);
    const nozzleGeometry = new THREE.SphereGeometry(0.035, 16, 12);
    const button = new THREE.Mesh(buttonGeometry, metal);
    button.position.y = 0.04;
    const spout = new THREE.Mesh(spoutGeometry, metal);
    spout.rotation.x = Math.PI / 2;
    spout.position.set(0.18, 0.02, 0.15);
    const nozzle = new THREE.Mesh(nozzleGeometry, dark);
    nozzle.position.set(0.18, 0.02, 0.29);
    this.pumpHead.add(button, spout, nozzle);
    this.pumpHead.position.set(0, 2.42, 0);
    this.bottleGroup.add(this.pumpHead);
    this.geometries.add(buttonGeometry);
    this.geometries.add(spoutGeometry);
    this.geometries.add(nozzleGeometry);
    this.materials.add(metal);
    this.materials.add(dark);
  }

  private addLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer?.capabilities.getMaxAnisotropy() ?? 1;
    this.labelCanvas = canvas;
    this.labelTexture = texture;
    this.textures.add(texture);

    void document.fonts.ready.then(() => {
      if (this.destroyed) return;
      this.drawLabel(canvas);
      texture.needsUpdate = true;
    });

    const geometry = new THREE.PlaneGeometry(1.38, 0.72, 32, 1);
    const positions = geometry.attributes['position'];
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      positions.setZ(i, 0.075 * (1 - (x / 0.69) ** 2));
    }
    geometry.computeVertexNormals();
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const label = new THREE.Mesh(geometry, material);
    label.position.set(0, -0.28, 1.215);
    label.renderOrder = 3;
    this.bottleGroup.add(label);
    this.labelGeometry = geometry;
    this.geometries.add(geometry);
    this.materials.add(material);
  }

  private drawLabel(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to draw the bottle label.');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#fff6ef';
    context.font = '700 112px Amiri, serif';
    context.fillText('AURELLE', 512, 132);
    context.strokeStyle = '#cba36a';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(238, 230);
    context.lineTo(786, 230);
    context.stroke();
    context.fillStyle = '#f8eadd';
    context.font = '400 42px Tajawal, sans-serif';
    context.fillText('EAU DE PARFUM', 512, 310);
    context.font = '400 34px Tajawal, sans-serif';
    context.fillText('50 ML', 512, 384);
  }

  private roundedRect(width: number, height: number, radius: number) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    return shape;
  }

  private resize() {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height || !this.renderer) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    const bottleHeight = this.host.parentElement?.clientHeight || height;
    this.bottleGroup.scale.setScalar(Math.min(1, bottleHeight / height));
    this.render();
  }

  private updateFrameLoop() {
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
    if (!this.visible || !this.pageVisible || this.destroyed || !this.renderer) return;
    this.lastFrame = 0;
    this.frame = requestAnimationFrame(this.drawFrame);
  }

  private drawFrame = (now: number) => {
    this.frame = 0;
    if (!this.visible || !this.pageVisible || this.destroyed) return;
    const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.05) : 1 / 60;
    this.lastFrame = now;
    this.elapsed += dt;
    const worldHeight = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const worldPerPixel = worldHeight / Math.max(1, this.host.clientHeight);

    this.storyGroup.position.x = this.pose.x * worldPerPixel;
    this.storyGroup.position.y = -this.pose.y * worldPerPixel + (this.motion.reduced ? 0 : Math.sin(this.elapsed * 1.15) * 0.018);
    this.storyGroup.scale.setScalar(this.pose.scale);
    this.storyGroup.rotation.z = THREE.MathUtils.degToRad(-this.pose.rotation);

    this.pointerX += (this.targetPointerX - this.pointerX) * Math.min(1, dt * 3);
    this.pointerY += (this.targetPointerY - this.pointerY) * Math.min(1, dt * 3);
    this.bottleGroup.rotation.y = -this.pointerX * 0.045;
    this.bottleGroup.rotation.x = this.pointerY * 0.035;
    this.render();
    this.frame = requestAnimationFrame(this.drawFrame);
  };

  private render() {
    if (!this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }

  private emitAtNozzle(kind: ScentKind) {
    if (!this.renderer || !this.model) return;
    this.scene.updateMatrixWorld(true);
    const nozzleWorld = this.pumpHead.localToWorld(NOZZLE_LOCAL.clone());
    const projected = nozzleWorld.project(this.camera);
    const u = (projected.x + 1) / 2;
    const v = (1 - projected.y) / 2;
    const canvas = this.canvas().nativeElement as QuadCanvas;
    const quad = canvas.getBoxQuads?.()[0];
    let screenX: number;
    let screenY: number;
    if (quad) {
      screenX = quad.p1.x + u * (quad.p2.x - quad.p1.x) + v * (quad.p4.x - quad.p1.x);
      screenY = quad.p1.y + u * (quad.p2.y - quad.p1.y) + v * (quad.p4.y - quad.p1.y);
    } else {
      const rect = canvas.getBoundingClientRect();
      screenX = rect.left + rect.width * u;
      screenY = rect.top + rect.height * v;
    }
    const mistRect = this.mistCanvas().hostElement.getBoundingClientRect();
    this.mistCanvas().emit({ x: screenX - mistRect.left, y: screenY - mistRect.top }, kind);
  }

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.host.getBoundingClientRect();
    this.targetPointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    this.targetPointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  };

  private onVisibilityChange = () => {
    this.pageVisible = !document.hidden;
    this.updateFrameLoop();
  };

  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.reportFailure(new Error('WebGL context was lost while rendering the hero bottle.'));
  };

  private reportFailure(error: unknown) {
    const failure = error instanceof Error ? error : new Error(String(error));
    console.error('Unable to initialize the hero 3D bottle.', failure);
    this.initializationFailed.emit(failure);
  }

  private disposeObject(object: THREE.Object3D) {
    object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) material.dispose();
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.pumpTimeline?.kill();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (this.canHover) window.removeEventListener('pointermove', this.onPointerMove);
    this.canvas().nativeElement.removeEventListener('webglcontextlost', this.onContextLost);
    if (this.frame) cancelAnimationFrame(this.frame);
    this.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => material.dispose());
    });
    this.geometries.forEach(geometry => geometry.dispose());
    this.materials.forEach(material => material.dispose());
    this.textures.forEach(texture => texture.dispose());
    this.labelCanvas = undefined;
    this.environmentTarget?.dispose();
    this.environment?.dispose();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.initializationFailed.complete();
  }
}
