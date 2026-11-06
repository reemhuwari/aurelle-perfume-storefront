import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CartLine } from '../models/order.model';
import { PerfumeService } from './perfume.service';

@Injectable({ providedIn: 'root' })
export class CartService {
  private perfumes = inject(PerfumeService);
  readonly lines = signal<CartLine[]>(this.restore());
  readonly count = computed(() => this.lines().reduce((s, l) => s + l.qty, 0));
  readonly detailed = computed(() => this.lines().flatMap((l, i) => {
    const p = this.perfumes.perfumes().find(x => x.id === l.perfumeId);
    const s = p?.sizes.find(z => z.ml === l.ml);
    return p && s ? [{ i, p, ml: l.ml, qty: l.qty, price: s.price }] : [];
  }));
  readonly total = computed(() => this.detailed().reduce((t, l) => t + l.price * l.qty, 0));

  constructor() { effect(() => localStorage.setItem('aur_cart', JSON.stringify(this.lines()))); }
  private restore(): CartLine[] { try { return JSON.parse(localStorage.getItem('aur_cart') || '[]'); } catch { return []; } }

  add(perfumeId: number, ml: number, qty = 1) {
    this.lines.update(ls => {
      const i = ls.findIndex(x => x.perfumeId === perfumeId && x.ml === ml);
      if (i < 0) return [...ls, { perfumeId, ml, qty }];
      const c = [...ls]; c[i] = { ...c[i], qty: Math.min(20, c[i].qty + qty) }; return c;
    });
  }
  setQty(i: number, qty: number) {
    if (qty < 1) return this.remove(i);
    this.lines.update(ls => ls.map((l, k) => k === i ? { ...l, qty: Math.min(20, qty) } : l));
  }
  remove(i: number) { this.lines.update(ls => ls.filter((_, k) => k !== i)); }
  clear() { this.lines.set([]); }
}
