import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, computed, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { PerfumeService } from '../../core/services/perfume.service';
import { MotionService } from '../../core/services/motion.service';
import { HeroBottle } from '../../shared/components/hero-bottle/hero-bottle';
import { PerfumeCard } from '../../shared/components/perfume-card/perfume-card';
import { Reveal } from '../../shared/directives/reveal.directive';
import { SplitText } from '../../shared/directives/split-text.directive';
import { Magnetic } from '../../shared/directives/magnetic.directive';
import { Spotlight } from '../../shared/directives/spotlight.directive';

@Component({
  selector: 'app-home',
  imports: [RouterLink, HeroBottle, PerfumeCard, Reveal, SplitText, Magnetic, Spotlight],
  templateUrl: './home.html'
})
export class Home implements AfterViewInit, OnDestroy {
  private perfumes = inject(PerfumeService);
  private motion = inject(MotionService);
  private zone = inject(NgZone);
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private intro?: ReturnType<typeof gsap.context>;
  private scroll?: ReturnType<typeof gsap.matchMedia>;
  private autoSpray?: ReturnType<typeof gsap.delayedCall>;
  private lastIdx = -1;
  hb = viewChild.required(HeroBottle);

  private familyImageMap: Record<string, string> = {
    floral: 'url("images/art/rose-royale.webp")',
    oud: 'url("images/art/white-oud.webp")',
    citrus: 'url("images/art/fajr-lemon.jpg")',
    oriental: 'url("images/art/saffron-night.jpg")',
    woody: 'url("images/art/cedar-wood.png")',
    aquatic: 'url("images/art/sea-spray.png")'
  };

  top = computed(() => this.perfumes.perfumes().slice(0, 4));
  famCards = computed(() => this.perfumes.families().map(family => {
    const list = this.perfumes.familyProducts(family.slug);
    return {
      ...family,
      count: list.length,
      color: list[0]?.color ?? '#d9567c',
      image: this.familyImageMap[family.slug] ?? 'url("images/art/rose-royale.webp")'
    };
  }));
  notes = ['ورد دمشقي', 'عود كمبودي', 'عنبر', 'زعفران', 'مسك أبيض', 'ياسمين', 'فانيليا'];
  chapters = [
    { n: '01', t: 'القمّة', d: 'أول ما يلامس البشرة: حمضيات وتوابل خفيفة تفتح العطر وتمنحه حيويته.' },
    { n: '02', t: 'القلب', d: 'بعد دقائق يظهر قلب العطر: الورد والزهور التي تصنع شخصيته وتستقر معك.' },
    { n: '03', t: 'القاعدة', d: 'ثم يبقى الأثر: العنبر والمسك والخشب تدوم لساعات وتترك بصمتك.' }
  ];

  ngAfterViewInit() {
    if (this.motion.reduced) return;                 // تجربة ثابتة بدون حركة (التنسيق في _motion.scss)
    this.zone.runOutsideAngular(() => { this.playIntro(); this.buildScrollStory(); });
  }

  /** 1) دخول الزجاجة عند تحميل الصفحة + حركة طفو خفيفة */
  private playIntro() {
    this.intro = gsap.context(() => {
      gsap.from('.bottle-in', { opacity: 0, y: 80, duration: 1.6, ease: 'power3.out', delay: 0.25 });
      gsap.from('.bottle-shadow', { opacity: 0, duration: 1.8, ease: 'power2.out', delay: 0.4 });
      this.autoSpray = gsap.delayedCall(2.2, () => this.hb().playIntroSequence());
      gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut', duration: 3.4 } })
        .to('.bottle-float', { y: -10, rotation: 0.8 })
        .to('.bottle-shadow i', { scaleX: 0.9, opacity: 0.75 }, 0);
    }, this.host);
  }

  /** 2) قصة التمرير: timeline واحد مربوط بالتمرير على طول .story (الـ stage لاصق بـ CSS sticky) */
  private buildScrollStory() {
    const q = gsap.utils.selector(this.host);
    const story = this.host.querySelector('.story');
    if (!story) return;
    this.scroll = gsap.matchMedia(this.host);
    this.scroll.add({ desk: '(min-width: 861px)', mob: '(max-width: 860px)' }, ctx => {
      const desk = !!ctx.conditions?.['desk'];
      const wrap = q('.bottle-wrap'), chs = q('.ch');
      const shift = desk ? '2vw' : '0vw';

      // وضعية البداية (الهيرو): الزجاجة على جانب الصفحة، وعلى الجوال تبقى بالمنتصف أعلى النص
      gsap.set(wrap, { x: desk ? '-24vw' : 0, y: 0, scale: 1, rotation: -4 });

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: story, start: 'top top', end: 'bottom bottom', scrub: 0.8,
          // رشّة عند دخول كل فصل (القمّة ثم القلب ثم القاعدة)، للأسفل فقط
          onUpdate: self => {
            const p = self.progress, idx = p < 0.22 ? -1 : p < 0.42 ? 0 : p < 0.62 ? 1 : 2;
            if (self.direction === 1 && idx > this.lastIdx && idx >= 0) this.hb().spray(idx + 1);
            this.lastIdx = idx;
          }
        }
      });
      // 0 → 2 : من الهيرو إلى الفصل الأول
      tl.to(wrap, { x: `-${shift}`, scale: 1.08, rotation: 0, duration: 2, ease: 'power1.inOut' }, 0)
        .to(q('.hero-copy'), { autoAlpha: 0, y: -50, duration: 1.1 }, 0.2)
        .to(q('.scroll-hint'), { opacity: 0, duration: 0.5 }, 0);
      // 2 → 8 : ثلاثة فصول، لكل فصل نص يدخل ويخرج وزجاجة تتحرك حركة بسيطة
      chs.forEach((el, i) => {
        const s = 2 + i * 2;
        tl.fromTo(el, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, s + 0.1)
          .to(el, { opacity: 0, y: -40, duration: 0.6, ease: 'power2.in' }, s + 1.5);
      });
      tl.to(wrap, { x: shift, scale: 1.12, rotation: 2, duration: 2, ease: 'power1.inOut' }, 2)
        .to(wrap, { x: `-${shift}`, scale: 1.1, rotation: -2, duration: 2, ease: 'power1.inOut' }, 4)
        .to(wrap, { x: shift, scale: 1.16, rotation: 1, duration: 2, ease: 'power1.inOut' }, 6)
        // 8 → 10 : تحرير الزجاجة قبل نهاية المقطع اللاصق
        .to(wrap, { x: 0, y: desk ? '-4vh' : '-3vh', scale: 1, rotation: 0, duration: 2, ease: 'power1.inOut' }, 8);
      tl.to(q('.progress i'), { scaleY: 1, duration: 10 }, 0);
    });
  }

  ngOnDestroy() { this.autoSpray?.kill(); this.scroll?.revert(); this.intro?.revert(); }
}
