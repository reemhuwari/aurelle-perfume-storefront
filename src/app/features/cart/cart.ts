import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/error';

@Component({ selector: 'app-cart', imports: [RouterLink, FormsModule], templateUrl: './cart.html' })
export class Cart {
  cart = inject(CartService);
  private auth = inject(AuthService); private orders = inject(OrderService);
  private router = inject(Router); private toast = inject(ToastService);
  address = ''; error = signal(''); busy = signal(false);
  async checkout() {
    if (!this.auth.requireLogin()) return;
    this.busy.set(true); this.error.set('');
    try { await this.orders.place(this.address); this.toast.show('تم استلام طلبك ✓'); this.router.navigate(['/account/orders']); }
    catch (e) { this.error.set(errorMessage(e)); }
    finally { this.busy.set(false); }
  }
}
