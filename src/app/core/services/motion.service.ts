import { Injectable, NgZone, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

/** يشغّل Lenis (تمرير ناعم) مع GSAP ScrollTrigger بحلقة واحدة، ويحترم prefers-reduced-motion. */
@Injectable({ providedIn: 'root' })
export class MotionService {
  readonly reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private zone = inject(NgZone);
  private router = inject(Router);
  private lenis?: Lenis;
  private tick = (t: number) => this.lenis?.raf(t * 1000);

  constructor() { gsap.registerPlugin(ScrollTrigger); }

  init() {
    // خارج zone.js حتى لا تُشغّل كل إطار animation دورة Change Detection
    this.zone.runOutsideAngular(() => {
      if (!this.reduced) {
        this.lenis = new Lenis({ lerp: 0.09 });
        this.lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(this.tick);
        gsap.ticker.lagSmoothing(0);
      }
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
        this.lenis?.scrollTo(0, { immediate: true });
        setTimeout(() => ScrollTrigger.refresh(), 200);
      });
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
    });
  }
}
