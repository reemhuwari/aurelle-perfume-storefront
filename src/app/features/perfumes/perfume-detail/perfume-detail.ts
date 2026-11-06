import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { PerfumeService } from '../../../core/services/perfume.service';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { FavoriteService } from '../../../core/services/favorite.service';
import { ToastService } from '../../../core/services/toast.service';
import { Bottle } from '../../../shared/components/bottle/bottle';
import { PerfumeCard } from '../../../shared/components/perfume-card/perfume-card';

@Component({ selector: 'app-perfume-detail', imports: [RouterLink, Bottle, PerfumeCard], templateUrl: './perfume-detail.html' })
export class PerfumeDetail {
  private svc = inject(PerfumeService); private auth = inject(AuthService); private cart = inject(CartService);
  private toast = inject(ToastService); private title = inject(Title);
  favs = inject(FavoriteService);
  slug = input.required<string>();                 // من الرابط /perfumes/:slug
  ml = signal(0);
  p = computed(() => this.svc.bySlug(this.slug()));
  size = computed(() => { const x = this.p(); return x ? (x.sizes.find(s => s.ml === this.ml()) ?? x.sizes[Math.min(2, x.sizes.length - 1)]) : undefined; });
  related = computed(() => this.svc.perfumes().filter(r => r.family === this.p()?.family && r.id !== this.p()?.id).slice(0, 4));
  constructor() {
    effect(() => { this.slug(); this.ml.set(0); });
    effect(() => { const x = this.p(); if (x) this.title.setTitle(x.name + ' | أوريل'); });
  }
  isPhoto(img?: string) { return !!img && !img.toLowerCase().endsWith('.svg'); }
  add() {
    const x = this.p(), s = this.size(); if (!x || !s) return;
    this.cart.add(x.id, s.ml); this.toast.show(`أُضيف ${x.name} (${s.ml} مل) إلى السلة`);
  }
  fav() { const x = this.p(); if (x && this.auth.requireLogin()) this.favs.toggle(x.id); }
}
