import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../core/models/order.model';

@Component({ selector: 'app-orders', imports: [DatePipe, RouterLink], templateUrl: './orders.html' })
export class Orders {
  orders = signal<Order[]>([]);
  loading = signal(true);
  constructor() {
    const u = inject(AuthService).user();
    if (u) inject(OrderService).mine(u.id).then(o => this.orders.set(o)).finally(() => this.loading.set(false));
  }
}
