import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Favorite } from '../models/user.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private url = `${environment.apiUrl}/favorites`;
  readonly items = signal<Favorite[]>([]);
  readonly ids = computed(() => this.items().map(f => f.perfumeId));

  constructor() {
    // يعيد تحميل المفضلة كلما تغيّر المستخدم (دخول / خروج)
    effect(() => { const u = this.auth.user(); if (u) this.load(u.id); else this.items.set([]); });
  }
  has(perfumeId: number) { return this.ids().includes(perfumeId); }
  private async load(userId: number) {
    try { this.items.set(await firstValueFrom(this.http.get<Favorite[]>(this.url, { params: { userId } }))); } catch { /* السيرفر متوقف */ }
  }
  async toggle(perfumeId: number) {
    const u = this.auth.user(); if (!u) return;
    const existing = this.items().find(f => f.perfumeId === perfumeId);
    if (existing) {
      await firstValueFrom(this.http.delete(`${this.url}/${existing.id}`));
      this.items.update(l => l.filter(f => f.id !== existing.id));
    } else {
      const f = await firstValueFrom(this.http.post<Favorite>(this.url, { userId: u.id, perfumeId }));
      this.items.update(l => [...l, f]);
    }
  }
}
