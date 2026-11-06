import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject, input } from '@angular/core';
import { gsap } from 'gsap';
import { MotionService } from '../../core/services/motion.service';

/**
 * ظهور تدريجي عند الوصول للعنصر.
 *   <div appReveal>                           ← يظهر العنصر نفسه
 *   <div appReveal="scale" revealItems=".card"> ← يظهر الأبناء المطابقون بتتابع
 */
@Directive({ selector: '[appReveal]' })
export class Reveal implements AfterViewInit, OnDestroy {
  appReveal = input<string>('');       // up (افتراضي) | fade | scale
  revealItems = input<string>('');
  delay = input(0);
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private zone = inject(NgZone);
  private motion = inject(MotionService);
  private ctx?: ReturnType<typeof gsap.context>;

  ngAfterViewInit() {
    if (this.motion.reduced) return;
    const kind = this.appReveal() || 'up', sel = this.revealItems();
    const targets = sel ? Array.from(this.host.querySelectorAll(sel)) : [this.host];
    if (!targets.length) return;
    this.zone.runOutsideAngular(() => {
      this.ctx = gsap.context(() => {
        gsap.from(targets, {
          opacity: 0, y: kind === 'up' ? 36 : 0, scale: kind === 'scale' ? 0.92 : 1,
          duration: 1, ease: 'power3.out', stagger: 0.09, delay: this.delay(),
          scrollTrigger: { trigger: this.host, start: 'top 88%', once: true }
        });
      }, this.host);
    });
  }
  ngOnDestroy() { this.ctx?.revert(); }
}
