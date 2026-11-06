import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order } from '../models/order.model';
import { AuthService } from './auth.service';
import { CartService } from './cart.service';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private cart = inject(CartService);
  private url = `${environment.apiUrl}/orders`;

  mine(userId: number) {
    return firstValueFrom(this.http.get<Order[]>(this.url, { params: { userId, _sort: 'createdAt', _order: 'desc' } }));
  }
  async place(address: string) {
    const u = this.auth.user(), lines = this.cart.detailed();
    if (!u) throw new Error('سجّل دخولك أولاً');
    if (!lines.length) throw new Error('السلة فارغة');
    if (!address.trim()) throw new Error('أدخل عنوان التوصيل');
    const order = {
      userId: u.id, createdAt: new Date().toISOString(), status: 'قيد المعالجة', address: address.trim(),
      items: lines.map(l => ({ perfumeId: l.p.id, name: l.p.name, ml: l.ml, qty: l.qty, price: l.price })),
      total: this.cart.total()
    };
    const saved = await firstValueFrom(this.http.post<Order>(this.url, order));
    this.cart.clear(); return saved;
  }
}
