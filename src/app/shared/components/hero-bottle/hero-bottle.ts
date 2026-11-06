import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, inject, viewChild } from '@angular/core';
import { gsap } from 'gsap';
import { MotionService } from '../../../core/services/motion.service';

const NOZZLE = { x: 286, y: 134 };
const MIST = ['#f0b4c6', '#f3dc86', '#f2a9bf', '#d9b27a'];

interface SprayParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  radius: number;
  startAt: number;
  lifetime: number;
  opacity: number;
  color: string;
}

@Component({
  selector: 'app-hero-bottle',
  template: `
  <svg #bottleSvg viewBox="0 0 540 1067" role="img" aria-label="زجاجة عطر أوريل">
    <defs>
      <linearGradient id="cap-metal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f8e3b0"/>
        <stop offset="26%" stop-color="#d7a95b"/>
        <stop offset="52%" stop-color="#8e5f2d"/>
        <stop offset="72%" stop-color="#f5d287"/>
        <stop offset="100%" stop-color="#6e4226"/>
      </linearGradient>
      <linearGradient id="nozzle-metal" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#f3c977"/>
        <stop offset="50%" stop-color="#b98039"/>
        <stop offset="100%" stop-color="#f5dd9f"/>
      </linearGradient>
    </defs>
    <g style="filter:drop-shadow(0 28px 34px rgba(0,0,0,.5))">
      <image href="images/hero/aurelle-body.webp" x="0" y="0" width="540" height="1067"/>

      

      <g #cap aria-label="غطاء الزجاجة">
        <image href="images/hero/aurelle-cap.png" x="118" y="-16" width="314" height="204" preserveAspectRatio="xMidYMid meet"/>
      </g>
    </g>
  </svg>
  <canvas #sprayCanvas aria-hidden="true"></canvas>`,
  styles: [`
    :host{display:block;position:relative;width:100%;height:100%;overflow:visible}
    svg{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible}
    canvas{position:absolute;z-index:1;top:-25%;left:0;width:220%;height:150%;display:block;pointer-events:none}
  `]
})
export class HeroBottle implements AfterViewInit, OnDestroy {
  private bottleSvg = viewChild.required<ElementRef<SVGSVGElement>>('bottleSvg');
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('sprayCanvas');
  private cap = viewChild.required<ElementRef<SVGGElement>>('cap');
  private nozzle = viewChild<ElementRef<SVGGElement>>('nozzle');
  private zone = inject(NgZone);
  private motion = inject(MotionService);
  private context?: CanvasRenderingContext2D;
  private resizeObserver?: ResizeObserver;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private frame = 0;
  private particles: SprayParticle[] = [];
  private capLifted = false;

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(this.canvas().nativeElement);
      this.resizeCanvas();
    });
  }

  playIntroSequence() {
    if (this.capLifted) {
      this.spray(0);
      return;
    }

    this.capLifted = true;
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    tl.to(this.cap().nativeElement, { y: -54, x: -10, rotation: -5, duration: 0.9 })
      .call(() => this.spray(0), [], 1.1);
    const nozzle = this.nozzle();
    if (nozzle) tl.to(nozzle.nativeElement, { y: 18, opacity: 1, duration: 0.55 }, 0.2);
  }

  /** Emit lit liquid droplets from the photographed atomizer nozzle. */
  spray(kind = 0) {
    const color = MIST[kind] ?? MIST[0];
    this.zone.runOutsideAngular(() => {
      if (!this.context) this.resizeCanvas();

      if (!this.capLifted) {
        this.playIntroSequence();
        return;
      }

      const now = performance.now();
      const reduced = this.motion.reduced;
      const count = reduced ? 180 : 520;
      for (let i = 0; i < count; i++) {
        const drift = reduced ? Math.random() * 680 : 120 + Math.random() * 210;
        const spread = reduced ? 0 : (Math.random() - 0.5) * 1.15;
        const launchAngle = reduced ? 0 : -0.78 + (Math.random() - 0.5) * 0.7;
        const speed = reduced ? 0 : 640 + Math.random() * 900;

        this.particles.push({
          x: NOZZLE.x + drift * 0.12,
          y: NOZZLE.y + (reduced ? (Math.random() - 0.5) * 8 : -4 + Math.random() * 12),
          vx: speed * Math.cos(launchAngle),
          vy: speed * Math.sin(launchAngle) - 120,
          gravity: reduced ? 0 : 52 + Math.random() * 90,
          radius: 0.7 + Math.pow(Math.random(), 1.7) * 4.6,
          startAt: now + (reduced ? 0 : i / count * 260),
          lifetime: reduced ? 0.85 : 0.74 + Math.random() * 0.54,
          opacity: 0.38 + Math.random() * 0.52,
          color: Math.random() < 0.2 ? '#fff8ef' : color
        });
      }

      if (!this.frame) this.frame = requestAnimationFrame(this.drawFrame);
    });
  }

  private resizeCanvas() {
    const canvas = this.canvas().nativeElement;
    const canvasRect = canvas.getBoundingClientRect();
    const svgRect = this.bottleSvg().nativeElement.getBoundingClientRect();
    if (!canvasRect.width || !canvasRect.height || !svgRect.width) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const cssScale = svgRect.width / 540;
    canvas.width = Math.ceil(canvasRect.width * pixelRatio);
    canvas.height = Math.ceil(canvasRect.height * pixelRatio);
    this.context = canvas.getContext('2d') ?? undefined;
    if (!this.context) throw new Error('Unable to create the Hero spray canvas context.');

    this.scale = cssScale * pixelRatio;
    this.offsetX = (svgRect.left - canvasRect.left) / cssScale;
    this.offsetY = (svgRect.top - canvasRect.top) / cssScale;
    this.context.setTransform(this.scale, 0, 0, this.scale, 0, 0);
  }

  private drawFrame = (now: number) => {
    this.frame = 0;
    const context = this.context;
    if (!context) return;

    context.clearRect(0, 0, this.canvas().nativeElement.width / this.scale, this.canvas().nativeElement.height / this.scale);
    const alive: SprayParticle[] = [];
    for (const particle of this.particles) {
      const elapsed = (now - particle.startAt) / 1000;
      if (elapsed < 0) {
        alive.push(particle);
        continue;
      }
      if (elapsed >= particle.lifetime) continue;

      const fade = Math.min(1, elapsed / 0.055, (particle.lifetime - elapsed) / 0.24);
      const x = particle.x + particle.vx * elapsed + this.offsetX;
      const y = particle.y + particle.vy * elapsed + particle.gravity * elapsed * elapsed / 2 + this.offsetY;
      this.drawDroplet(context, x, y, particle.radius, particle.color, particle.opacity * fade);
      alive.push(particle);
    }

    this.particles = alive;
    if (alive.length) {
      this.frame = requestAnimationFrame(this.drawFrame);
    } else {
      context.clearRect(0, 0, this.canvas().nativeElement.width / this.scale, this.canvas().nativeElement.height / this.scale);
    }
  };

  private drawDroplet(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, opacity: number) {
    context.globalAlpha = opacity;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
    context.lineWidth = Math.max(0.35, radius * 0.18);
    context.strokeStyle = 'rgba(255,255,255,.72)';
    context.stroke();
    context.beginPath();
    context.ellipse(x - radius * 0.28, y - radius * 0.3, radius * 0.25, radius * 0.14, -Math.PI / 4, 0, Math.PI * 2);
    context.fillStyle = '#fff';
    context.fill();
    context.globalAlpha = 1;
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    if (this.frame) cancelAnimationFrame(this.frame);
    this.particles = [];
    gsap.killTweensOf(this.cap().nativeElement);
    const nozzle = this.nozzle();
    if (nozzle) gsap.killTweensOf(nozzle.nativeElement);
  }
}
