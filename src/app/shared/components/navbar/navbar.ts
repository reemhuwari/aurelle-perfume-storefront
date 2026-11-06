import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { FavoriteService } from '../../../core/services/favorite.service';

@Component({ selector: 'app-navbar', imports: [RouterLink, RouterLinkActive], templateUrl: './navbar.html' })
export class Navbar {
  auth = inject(AuthService);
  cart = inject(CartService);
  favs = inject(FavoriteService);   // يُنشأ مبكراً ليحمّل مفضلة المستخدم
  hidden = signal(false);           // يختفي عند النزول ويظهر عند الصعود
  solid = signal(false);            // خلفية زجاجية بعد أول تمرير
  open = signal(false);             // قائمة الجوال
  private last = 0;

  @HostListener('window:scroll')
  onScroll() {
    const y = scrollY;
    this.solid.set(y > 40);
    this.hidden.set(y > this.last && y > 200 && !this.open());
    this.last = y;
  }
}
