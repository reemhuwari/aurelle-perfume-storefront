import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, inject, input, viewChild } from '@angular/core';
import { gsap } from 'gsap';
import { environment } from '../../../../environments/environment';
import { MotionService } from '../../../core/services/motion.service';
import { MistCanvas, ScentKind } from '../mist-canvas/mist-canvas';

const CUT_PERCENT = 10;
const NOZZLE_X_RATIO = 0.5;
const NOZZLE_Y_RATIO = 0.049;
const PRESS_DISTANCE_RATIO = 0.07;

@Component({
  selector: 'app-hero-bottle',
  standalone: true,
  template: `
    <div #bottleLayers class="hero-bottle" [class.debug-cut]="debugCut" [style.--cut]="cutPercent + '%'">
      <picture class="bottle-layer body-layer">
        <source srcset="images/hero/aurelle-body-transparent.webp" type="image/webp">
        <img src="images/hero/aurelle-body-transparent.png" width="664" height="1256"
          alt="زجاجة عطر أوريل">
      </picture>
      <picture #headLayer class="bottle-layer head-layer">
        <source srcset="images/hero/aurelle-body-transparent.webp" type="image/webp">
        <img src="images/hero/aurelle-body-transparent.png" width="664" height="1256"
          alt="" aria-hidden="true">
      </picture>
      @if (debugCut) {
        <span #debugReadout class="debug-readout" aria-live="polite">Cut: {{ cutPercent }}%</span>
      }
    </div>
  `,
  styles: [`
    :host{position:relative;display:block;width:100%;height:100%;pointer-events:none}
    .hero-bottle{position:absolute;inset:0;transform-origin:50% 50%}
    .bottle-layer{position:absolute;inset:0;display:block;width:100%;height:100%;margin:0}
    .bottle-layer img{display:block;width:100%;height:100%;object-fit:contain}
    .body-layer{clip-path:inset(var(--cut) 0 0 0)}
    .head-layer{clip-path:inset(0 0 calc(100% - var(--cut)) 0);transform-origin:50% 100%}
    .debug-cut::after{content:"";position:absolute;inset-inline:0;top:var(--cut);z-index:5;border-top:1px solid #ff3b30}
    .debug-readout{position:absolute;top:var(--cut);inset-inline-start:0;z-index:6;padding:2px 5px;background:#12060a;color:#fff;font:12px monospace}
  `]
})
export class HeroBottle implements AfterViewInit, OnDestroy {
  mistCanvas = input.required<MistCanvas>();
  private readonly bottleLayers = viewChild.required<ElementRef<HTMLElement>>('bottleLayers');
  private readonly headLayer = viewChild.required<ElementRef<HTMLElement>>('headLayer');
  private readonly debugReadout = viewChild<ElementRef<HTMLElement>>('debugReadout');
  private readonly zone = inject(NgZone);
  private readonly motion = inject(MotionService);
  readonly debugCut = !environment.production && new URLSearchParams(window.location.search).has('debugCut');
  cutPercent = CUT_PERCENT;
  private pressTimeline?: gsap.core.Timeline;
  private lastSprayAt = -Infinity;

  ngAfterViewInit() {
    if (this.debugCut) this.zone.runOutsideAngular(() => window.addEventListener('keydown', this.onDebugKey));
  }

  playIntroSequence() {
    this.spray(0);
  }

  spray(kind: ScentKind = 0) {
    this.zone.runOutsideAngular(() => {
      const now = performance.now();
      if (this.pressTimeline?.isActive() || now - this.lastSprayAt < 300) return;
      this.lastSprayAt = now;

      if (this.motion.reduced) {
        this.emitAtNozzle(kind);
        return;
      }

      const head = this.headLayer().nativeElement;
      const bottle = this.bottleLayers().nativeElement;
      const headBounds = head.getBoundingClientRect();
      const pressDistance = headBounds.height * this.cutPercent / 100 * PRESS_DISTANCE_RATIO;

      this.pressTimeline = gsap.timeline()
        .to(head, { y: pressDistance, duration: 0.12, ease: 'power2.in' }, 0)
        .to(head, { filter: 'brightness(0.82)', duration: 0.08, ease: 'power1.out' }, 0)
        .to(bottle, { x: 1.5, y: 2, rotation: 0.3, duration: 0.12, ease: 'power2.in' }, 0)
        .call(() => this.emitAtNozzle(kind), [], 0.12)
        .to({}, { duration: 0.08 })
        .to(head, { y: 0, filter: 'brightness(1)', duration: 0.45, ease: 'back.out(1.7)' })
        .to(bottle, { x: 0, y: 0, rotation: 0, duration: 0.45, ease: 'power2.out' }, '<')
        .to({}, { duration: 0.15 });
    });
  }

  private emitAtNozzle(kind: ScentKind) {
    const headBounds = this.headLayer().nativeElement.getBoundingClientRect();
    const origin = {
      x: headBounds.left + headBounds.width * NOZZLE_X_RATIO,
      y: headBounds.top + headBounds.height * NOZZLE_Y_RATIO
    };
    const canvasRect = this.mistCanvas().hostElement.getBoundingClientRect();
    this.mistCanvas().emit({ x: origin.x - canvasRect.left, y: origin.y - canvasRect.top }, kind);
  }

  private onDebugKey = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    this.cutPercent = Math.max(1, Math.min(40, this.cutPercent + (event.key === 'ArrowDown' ? 0.25 : -0.25)));
    this.bottleLayers().nativeElement.style.setProperty('--cut', `${this.cutPercent}%`);
    const readout = this.debugReadout();
    if (readout) readout.nativeElement.textContent = `Cut: ${this.cutPercent.toFixed(2)}%`;
    console.info(`Hero bottle cut line: ${this.cutPercent.toFixed(2)}%`);
  };

  ngOnDestroy() {
    window.removeEventListener('keydown', this.onDebugKey);
    this.pressTimeline?.kill();
  }
}
