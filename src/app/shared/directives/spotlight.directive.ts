import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

/** إضاءة ناعمة تتبع المؤشر فوق العنصر (CSS + متغيّرات فقط، بدون مكتبة). التنسيق في styles/_motion.scss */
@Directive({ selector: '[appSpotlight]', host: { class: 'spot' } })
export class Spotlight implements AfterViewInit, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private zone = inject(NgZone);
  private move = (e: PointerEvent) => {
    const r = this.el.getBoundingClientRect();
    this.el.style.setProperty('--mx', e.clientX - r.left + 'px'); this.el.style.setProperty('--my', e.clientY - r.top + 'px');
  };
  ngAfterViewInit() { this.zone.runOutsideAngular(() => this.el.addEventListener('pointermove', this.move)); }
  ngOnDestroy() { this.el.removeEventListener('pointermove', this.move); }
}
