import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';
import { gsap } from 'gsap';
import { MotionService } from '../../core/services/motion.service';

/** زر "مغناطيسي" يميل قليلاً نحو المؤشر. يعمل فقط على الأجهزة التي فيها hover. */
@Directive({ selector: '[appMagnetic]' })
export class Magnetic implements AfterViewInit, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private zone = inject(NgZone);
  private motion = inject(MotionService);
  private qx?: (v: number) => unknown;
  private qy?: (v: number) => unknown;
  private move = (e: PointerEvent) => {
    const r = this.el.getBoundingClientRect();
    this.qx?.((e.clientX - r.left - r.width / 2) * 0.3); this.qy?.((e.clientY - r.top - r.height / 2) * 0.3);
  };
  private leave = () => { this.qx?.(0); this.qy?.(0); };

  ngAfterViewInit() {
    if (this.motion.reduced || !matchMedia('(hover: hover)').matches) return;
    this.zone.runOutsideAngular(() => {
      this.qx = gsap.quickTo(this.el, 'x', { duration: 0.6, ease: 'elastic.out(1,0.5)' });
      this.qy = gsap.quickTo(this.el, 'y', { duration: 0.6, ease: 'elastic.out(1,0.5)' });
      this.el.addEventListener('pointermove', this.move); this.el.addEventListener('pointerleave', this.leave);
    });
  }
  ngOnDestroy() { this.el.removeEventListener('pointermove', this.move); this.el.removeEventListener('pointerleave', this.leave); }
}
