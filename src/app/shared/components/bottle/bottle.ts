import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, effect, inject, input, viewChild } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** يعرض public/models/bottle.glb ويلوّن السائل (الشبكة المسمّاة Liquid) بلون العطر. */
@Component({ selector: 'app-bottle', templateUrl: './bottle.html', styleUrl: './bottle.scss' })
export class Bottle implements AfterViewInit, OnDestroy {
  color = input('#d9567c');
  model = input('models/bottle.glb');
  private cv = viewChild.required<ElementRef<HTMLCanvasElement>>('cv');
  private zone = inject(NgZone);
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  private group = new THREE.Group();
  private liquid?: THREE.Mesh;
  private petals: THREE.Mesh[] = [];
  private mist!: THREE.Points;
  private mistPos = new Float32Array(150 * 3);
  private mistVel: THREE.Vector3[] = [];
  private mistLife = 0;
  private raf = 0;
  private ro?: ResizeObserver;
  private mx = 0; private my = 0; private spin = 0; private drag = false; private lastX = 0;
  private onMove = (e: PointerEvent) => {
    this.mx = e.clientX / innerWidth - 0.5; this.my = e.clientY / innerHeight - 0.5;
    if (this.drag) { this.spin += (e.clientX - this.lastX) * 0.01; this.lastX = e.clientX; }
  };
  private onUp = () => (this.drag = false);

  constructor() { effect(() => { this.color(); this.applyColor(); }); }
  ngAfterViewInit() { this.zone.runOutsideAngular(() => this.init()); }

  private applyColor() {
    const m = this.liquid?.material as THREE.MeshStandardMaterial | undefined;
    if (m) { m.color.set(this.color()); m.emissive.set(this.color()).multiplyScalar(0.25); }
  }

  private init() {
    const canvas = this.cv().nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const key = new THREE.PointLight(0xffc7d4, 60, 40); key.position.set(-4, 4, 6); this.scene.add(key);
    const rim = new THREE.PointLight(0xcba36a, 40, 40); rim.position.set(5, -2, 4); this.scene.add(rim);
    this.camera.position.set(0, 0, 12);
    this.scene.add(this.group);

    new GLTFLoader().load(this.model(), gltf => {
      const model = gltf.scene;
      model.traverse(o => {
        if (o.name === 'Liquid') { this.liquid = o as THREE.Mesh; this.liquid.material = (this.liquid.material as THREE.Material).clone(); }
      });
      const c = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
      model.position.sub(c); this.group.add(model); this.applyColor();
    }, undefined, err => console.error('تعذّر تحميل ملف GLB:', err));

    this.makePetals(); this.makeMist();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas.parentElement!); this.resize();
    addEventListener('pointermove', this.onMove); addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointerdown', e => { this.drag = true; this.lastX = e.clientX; });
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; let t = 0;
    const loop = () => {
      this.raf = requestAnimationFrame(loop); t += 0.016;
      if (!this.drag && !reduce) this.spin += 0.006;
      const g = this.group;
      g.rotation.y += (this.spin - g.rotation.y) * 0.08;
      g.rotation.x += (this.my * 0.35 - g.rotation.x) * 0.05;
      g.rotation.z = Math.sin(t * 0.8) * 0.04 - this.mx * 0.12;
      g.position.y = Math.sin(t) * 0.12;
      for (const p of this.petals) {
        const d = p.userData as { v: number; r: THREE.Vector3; ph: number };
        p.position.y -= d.v; p.position.x += Math.sin(t + d.ph) * 0.004;
        p.rotation.x += d.r.x; p.rotation.y += d.r.y; p.rotation.z += d.r.z;
        if (p.position.y < -6.5) p.position.y = 6.5;
      }
      if (this.mistLife > 0) {
        this.mistLife -= 0.012; (this.mist.material as THREE.PointsMaterial).opacity = Math.max(this.mistLife, 0) * 0.9;
        for (let i = 0; i < 150; i++) {
          const v = this.mistVel[i]; if (!v) continue;
          this.mistPos[i * 3] += v.x; this.mistPos[i * 3 + 1] += v.y; this.mistPos[i * 3 + 2] += v.z; v.multiplyScalar(0.985);
        }
        this.mist.geometry.attributes['position'].needsUpdate = true;
      }
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  private makePetals() {
    const sh = new THREE.Shape(); sh.moveTo(0, 0);
    sh.bezierCurveTo(0.3, 0.1, 0.35, 0.5, 0, 0.7); sh.bezierCurveTo(-0.35, 0.5, -0.3, 0.1, 0, 0);
    const geo = new THREE.ShapeGeometry(sh);
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.96, 0.6, 0.55 + Math.random() * 0.2), side: THREE.DoubleSide, roughness: 0.5, transparent: true, opacity: 0.9 }));
      m.scale.setScalar(0.25 + Math.random() * 0.35);
      m.position.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 6 - 2);
      m.userData = { v: 0.004 + Math.random() * 0.008, r: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.02), ph: Math.random() * 6 };
      this.scene.add(m); this.petals.push(m);
    }
  }
  private makeMist() {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.mistPos, 3));
    this.mist = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd9e2, size: 0.07, transparent: true, opacity: 0, depthWrite: false }));
    this.scene.add(this.mist);
  }
  /** من الصفحة: <app-bottle #b /> ثم (click)="b.spray()" */
  spray() {
    this.mistLife = 1;
    for (let i = 0; i < 150; i++) {
      this.mistPos.set([0, 2.9, 0], i * 3);
      this.mistVel[i] = new THREE.Vector3((Math.random() - 0.3) * 0.07, (Math.random() + 0.2) * 0.05, (Math.random() - 0.5) * 0.06);
    }
  }
  private resize() {
    const el = this.cv().nativeElement.parentElement!, w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  ngOnDestroy() {
    cancelAnimationFrame(this.raf); this.ro?.disconnect();
    removeEventListener('pointermove', this.onMove); removeEventListener('pointerup', this.onUp);
    this.scene.traverse(o => (o as THREE.Mesh).geometry?.dispose?.());
    this.renderer?.dispose();
  }
}
