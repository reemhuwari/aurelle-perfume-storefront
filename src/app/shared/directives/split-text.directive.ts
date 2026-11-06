import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject, input } from '@angular/core';
import { gsap } from 'gsap';
import { MotionService } from '../../core/services/motion.service';

/**
 * يقسّم العنوان إلى كلمات (وليس حروفاً: تقسيم الحروف يكسر اتصال الحروف العربية) ويكشفها بقناع.
 * استخدمه للعناوين الثابتة فقط، لا للنص المتغيّر بـ {{ }}.
 */
@Directive({ selector: '[appSplitText]' })
export class SplitText implements AfterViewInit, OnDestroy {
  onScroll = input(false);
  delay = input(0);
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private zone = inject(NgZone);
  private motion = inject(MotionService);
  private ctx?: ReturnType<typeof gsap.context>;

  ngAfterViewInit() {
    if (this.motion.reduced) return;
    this.host.setAttribute('aria-label', this.host.textContent?.replace(/\s+/g, ' ').trim() ?? '');
    this.wrap(this.host);
    this.host.querySelectorAll('.w').forEach(w => w.setAttribute('aria-hidden', 'true'));
    this.zone.runOutsideAngular(() => {
      this.ctx = gsap.context(() => {
        gsap.from(this.host.querySelectorAll('.wi'), {
          yPercent: 115, duration: 1.1, ease: 'power4.out', stagger: 0.07, delay: this.delay(),
          scrollTrigger: this.onScroll() ? { trigger: this.host, start: 'top 85%', once: true } : undefined
        });
      }, this.host);
    });
  }
  private wrap(node: Node) {
    if (node.nodeType === 3) {
      const frag = document.createDocumentFragment();
      (node.textContent ?? '').split(/(\s+)/).forEach(t => {
        if (!t) return;
        if (/^\s+$/.test(t)) { frag.append(' '); return; }
        const o = document.createElement('span'); o.className = 'w';
        const i = document.createElement('span'); i.className = 'wi'; i.textContent = t;
        o.append(i); frag.append(o);
      });
      node.parentNode?.replaceChild(frag, node);
    } else if (node.nodeType === 1 && (node as HTMLElement).tagName !== 'BR') {
      Array.from(node.childNodes).forEach(c => this.wrap(c));
    }
  }
  ngOnDestroy() { this.ctx?.revert(); }
}
