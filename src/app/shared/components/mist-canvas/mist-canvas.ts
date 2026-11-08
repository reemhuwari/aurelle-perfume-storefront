import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, inject, viewChild } from '@angular/core';
import { MotionService } from '../../../core/services/motion.service';

export type ScentKind = 0 | 1 | 2 | 3;
export interface SprayOrigin { x: number; y: number; }

export const SCENT_NOTES = [
  { label: 'القمّة', text: 'حمضيات' },
  { label: 'القلب', text: 'ورد دمشقي' },
  { label: 'القاعدة', text: 'عنبر ومسك' }
] as const;

const PARTICLE_CAPACITY = 600;
const GRID_COLUMNS = 32;
const GRID_ROWS = 18;
const COLORS: readonly string[] = ['#f0b4c6', '#f3dc86', '#f2a9bf', '#d9b27a'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  radius: number;
  opacity: number;
  gravity: number;
  drag: number;
  kind: ScentKind;
  puff: boolean;
  active: boolean;
  phase: number;
}

@Component({
  selector: 'app-mist-canvas',
  standalone: true,
  template: `
    <canvas #canvas aria-hidden="true"></canvas>
  `,
  styles: [`
    :host{position:absolute;inset:0;display:block;z-index:3;pointer-events:none;overflow:hidden}
    canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
  `]
})
export class MistCanvas implements AfterViewInit, OnDestroy {
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private zone = inject(NgZone);
  private motion = inject(MotionService);
  private stage?: HTMLElement;
  private context?: CanvasRenderingContext2D;
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private readonly particles = Array.from({ length: PARTICLE_CAPACITY }, (): Particle => ({
    x: 0, y: 0, vx: 0, vy: 0, age: 0, lifetime: 1, radius: 1, opacity: 0,
    gravity: 0, drag: 0, kind: 0, puff: false, active: false, phase: 0
  }));
  private readonly density = new Float32Array(GRID_COLUMNS * GRID_ROWS);
  private readonly noteElements: HTMLElement[] = [];
  private readonly noteCells = new Int16Array(SCENT_NOTES.length * 2);
  private readonly noteOpacity = new Float32Array(SCENT_NOTES.length);
  private readonly noteLastSeen = new Float64Array(SCENT_NOTES.length);
  private readonly puffSprites: HTMLCanvasElement[] = [];
  private width = 0;
  private height = 0;
  private pixelRatio = 1;
  private frame = 0;
  private lastFrame = 0;
  private elapsed = 0;
  private lastEmit = -Infinity;
  private visible = true;
  private pageVisible = !document.hidden;

  get hostElement() { return this.host; }

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      this.stage = this.host.parentElement ?? undefined;
      if (!this.stage) throw new Error('The hero mist canvas must be placed inside the hero stage.');

      this.noteElements.push(...this.stage.querySelectorAll<HTMLElement>('.scent-note'));
      if (this.noteElements.length !== SCENT_NOTES.length) {
        throw new Error(`The hero stage must contain ${SCENT_NOTES.length} scent note labels.`);
      }

      const context = this.canvas().nativeElement.getContext('2d', { alpha: true });
      if (!context) throw new Error('Unable to create the Hero mist canvas context.');
      this.context = context;
      this.createPuffSprites();
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(this.stage);
      this.intersectionObserver = new IntersectionObserver(entries => {
        this.visible = entries[0]?.isIntersecting ?? false;
        this.updateLoopState();
      });
      this.intersectionObserver.observe(this.stage);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.resizeCanvas();
    });
  }

  emit(origin: SprayOrigin, kind: ScentKind) {
    if (this.motion.reduced) {
      for (const note of this.noteElements) {
        note.style.setProperty('--scent-reveal', '1');
        note.style.setProperty('--scent-blur', '0px');
      }
      return;
    }

    const now = performance.now();
    if (now - this.lastEmit < 500) return;
    this.lastEmit = now;
    const mobile = this.width <= 860;
    const puffCount = 150;
    const dropletCount = PARTICLE_CAPACITY - puffCount;
    let emittedPuffs = 0;
    let emittedDroplets = 0;

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      if (particle.active) continue;
      const puff = emittedPuffs < puffCount;
      if (puff) emittedPuffs++;
      else if (emittedDroplets < dropletCount) emittedDroplets++;
      else break;

      const angle = (Math.random() - 0.5) * (mobile ? 0.95 : 0.64) + (mobile ? 0.22 : 0.02);
      const speed = puff ? 220 + Math.random() * 130 : 270 + Math.random() * 180;
      particle.x = origin.x + (Math.random() - 0.5) * 5;
      particle.y = origin.y + (Math.random() - 0.5) * 5;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.age = Math.random() * -0.18;
      particle.lifetime = puff ? 2.6 + Math.random() * 1.7 : 0.8 + Math.random() * 0.9;
      particle.radius = puff ? 8 + Math.random() * 27 : 0.7 + Math.random() * 0.8;
      particle.opacity = puff ? 0.22 + Math.random() * 0.22 : 0.18 + Math.random() * 0.2;
      particle.gravity = puff ? -3 - Math.random() * 5 : 10 + Math.random() * 18;
      particle.drag = puff ? 0.12 + Math.random() * 0.08 : 0.7 + Math.random() * 0.5;
      particle.kind = kind;
      particle.puff = puff;
      particle.phase = Math.random() * Math.PI * 2;
      particle.active = true;
    }

    this.updateNoteCells();
    this.updateLoopState();
  }

  private createPuffSprites() {
    for (const color of COLORS) {
      const sprite = document.createElement('canvas');
      sprite.width = 64;
      sprite.height = 64;
      const context = sprite.getContext('2d');
      if (!context) throw new Error('Unable to create a Hero mist puff sprite.');
      const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 32);
      gradient.addColorStop(0, `${color}66`);
      gradient.addColorStop(0.35, `${color}38`);
      gradient.addColorStop(0.72, `${color}12`);
      gradient.addColorStop(1, `${color}00`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
      this.puffSprites.push(sprite);
    }
  }

  private resizeCanvas() {
    const canvas = this.canvas().nativeElement;
    const rect = this.host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.width = rect.width;
    this.height = rect.height;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(this.width * this.pixelRatio);
    canvas.height = Math.ceil(this.height * this.pixelRatio);
    this.context?.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.updateNoteCells();
    if (this.context) this.context.clearRect(0, 0, this.width, this.height);
  }

  private updateNoteCells() {
    const stageRect = this.stage?.getBoundingClientRect();
    if (!stageRect || !this.width || !this.height) return;

    for (let i = 0; i < this.noteElements.length; i++) {
      const rect = this.noteElements[i].getBoundingClientRect();
      const x = (rect.left + rect.width / 2 - stageRect.left) / this.width;
      const y = (rect.top + rect.height / 2 - stageRect.top) / this.height;
      this.noteCells[i * 2] = Math.max(0, Math.min(GRID_COLUMNS - 1, Math.floor(x * GRID_COLUMNS)));
      this.noteCells[i * 2 + 1] = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(y * GRID_ROWS)));
    }
  }

  private updateLoopState() {
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
    if (!this.visible || !this.pageVisible || !this.hasActiveParticles()) return;
    this.lastFrame = 0;
    this.frame = requestAnimationFrame(this.drawFrame);
  }

  private hasActiveParticles() {
    for (let i = 0; i < this.particles.length; i++) if (this.particles[i].active) return true;
    return false;
  }

  private drawFrame = (now: number) => {
    this.frame = 0;
    if (!this.visible || !this.pageVisible) return;
    const context = this.context;
    if (!context) return;
    const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.05) : 1 / 60;
    this.lastFrame = now;
    this.elapsed += dt;
    context.clearRect(0, 0, this.width, this.height);
    for (let i = 0; i < this.density.length; i++) this.density[i] *= 0.92;

    context.globalCompositeOperation = 'screen';
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      if (!particle.active) continue;
      particle.age += dt;
      if (particle.age < 0) continue;
      if (particle.age >= particle.lifetime) {
        particle.active = false;
        continue;
      }

      const progress = particle.age / particle.lifetime;
      const time = this.elapsed * 0.16 + particle.phase;
      const nx = particle.x * 0.004 + time;
      const ny = particle.y * 0.004 - time * 0.37;
      const curlX = (this.valueNoise(nx, ny + 3) - 0.5) * 2;
      const curlY = (0.5 - this.valueNoise(nx + 3, ny)) * 2;
      particle.vx += ((particle.puff ? 72 : 34) + curlX * 13) * dt;
      particle.vy += (particle.gravity + curlY * 13) * dt;
      const damping = Math.exp(-particle.drag * dt);
      particle.vx *= damping;
      particle.vy *= damping;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;

      const fadeIn = Math.min(1, particle.age / 0.16);
      const fadeOut = this.smoothStep(Math.min(1, (particle.lifetime - particle.age) / (particle.puff ? 0.9 : 0.28)));
      const alpha = particle.opacity * fadeIn * fadeOut;
      if (particle.puff) {
        const radius = particle.radius * (0.7 + progress * 1.1);
        const sprite = this.puffSprites[particle.kind];
        context.globalAlpha = alpha;
        context.drawImage(sprite, particle.x - radius, particle.y - radius, radius * 2, radius * 2);
        this.addDensity(particle.x, particle.y, radius, alpha);
      } else {
        context.globalAlpha = alpha;
        context.fillStyle = COLORS[particle.kind];
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius * (0.9 + progress * 0.3), 0, Math.PI * 2);
        context.fill();
        this.addDensity(particle.x, particle.y, particle.radius * 5, alpha * 0.04);
      }
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    this.updateNoteReveal(dt, now);

    if (this.hasActiveParticles() || this.hasOngoingReveal(now)) this.frame = requestAnimationFrame(this.drawFrame);
    else context.clearRect(0, 0, this.width, this.height);
  };

  private hasOngoingReveal(now: number) {
    for (let i = 0; i < this.noteOpacity.length; i++) {
      if (this.noteOpacity[i] > 0.01 || (this.noteLastSeen[i] > 0 && now - this.noteLastSeen[i] < 4200)) return true;
    }
    return false;
  }

  private addDensity(x: number, y: number, radius: number, strength: number) {
    const cellWidth = this.width / GRID_COLUMNS;
    const cellHeight = this.height / GRID_ROWS;
    const centerX = x / cellWidth;
    const centerY = y / cellHeight;
    const spreadX = Math.max(1, radius / cellWidth);
    const spreadY = Math.max(1, radius / cellHeight);
    const minX = Math.max(0, Math.floor(centerX - spreadX * 2));
    const maxX = Math.min(GRID_COLUMNS - 1, Math.ceil(centerX + spreadX * 2));
    const minY = Math.max(0, Math.floor(centerY - spreadY * 2));
    const maxY = Math.min(GRID_ROWS - 1, Math.ceil(centerY + spreadY * 2));

    for (let row = minY; row <= maxY; row++) {
      for (let column = minX; column <= maxX; column++) {
        const dx = (column + 0.5 - centerX) / spreadX;
        const dy = (row + 0.5 - centerY) / spreadY;
        this.density[row * GRID_COLUMNS + column] += strength * Math.exp(-(dx * dx + dy * dy) * 0.7) * 0.16;
      }
    }
  }

  private updateNoteReveal(dt: number, now: number) {
    for (let note = 0; note < this.noteElements.length; note++) {
      const centerX = this.noteCells[note * 2];
      const centerY = this.noteCells[note * 2 + 1];
      let sample = 0;
      for (let row = Math.max(0, centerY - 1); row <= Math.min(GRID_ROWS - 1, centerY + 1); row++) {
        for (let column = Math.max(0, centerX - 1); column <= Math.min(GRID_COLUMNS - 1, centerX + 1); column++) {
          sample = Math.max(sample, this.density[row * GRID_COLUMNS + column]);
        }
      }

      if (sample > 0.075) this.noteLastSeen[note] = now;
      const linger = (now - this.noteLastSeen[note]) / 1000;
      const target = linger < 3 ? 1 : Math.max(0, 1 - (linger - 3) / 1.1);
      this.noteOpacity[note] += (target - this.noteOpacity[note]) * Math.min(1, dt * 3.8);
      const opacity = this.noteOpacity[note];
      this.noteElements[note].style.setProperty('--scent-reveal', opacity.toFixed(3));
      this.noteElements[note].style.setProperty('--scent-blur', `${((1 - opacity) * 8).toFixed(2)}px`);
    }
  }

  private valueNoise(x: number, y: number) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = this.smoothStep(x - x0);
    const ty = this.smoothStep(y - y0);
    const top = this.hash(x0, y0) * (1 - tx) + this.hash(x0 + 1, y0) * tx;
    const bottom = this.hash(x0, y0 + 1) * (1 - tx) + this.hash(x0 + 1, y0 + 1) * tx;
    return top * (1 - ty) + bottom * ty;
  }

  private hash(x: number, y: number) {
    const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  private smoothStep(value: number) { return value * value * (3 - 2 * value); }

  private onVisibilityChange = () => {
    this.pageVisible = !document.hidden;
    this.updateLoopState();
  };

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (this.frame) cancelAnimationFrame(this.frame);
    this.context?.clearRect(0, 0, this.width, this.height);
    this.particles.forEach(particle => { particle.active = false; });
    this.puffSprites.length = 0;
  }
}
