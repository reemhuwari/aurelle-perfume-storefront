import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Perfume } from '../../../core/models/perfume.model';
import { AuthService } from '../../../core/services/auth.service';
import { FavoriteService } from '../../../core/services/favorite.service';
import { BottleArt } from '../bottle-art/bottle-art';
import { Spotlight } from '../../directives/spotlight.directive';

@Component({ selector: 'app-perfume-card', imports: [RouterLink, BottleArt, Spotlight], templateUrl: './perfume-card.html' })
export class PerfumeCard {
  p = input.required<Perfume>();
  fav = inject(FavoriteService);
  private auth = inject(AuthService);
  /** صورة فوتوغرافية حقيقية (jpg/png/webp/jpeg)؟ الرسم الاحتياطي svg يُعرض بالأسلوب القديم */
  isPhoto = computed(() => {
    const i = this.p().image ?? '';
    return /\.(png|jpe?g|webp)$/i.test(i);
  });
  toggle(e: Event) {
    e.preventDefault(); e.stopPropagation();
    if (this.auth.requireLogin()) this.fav.toggle(this.p().id);
  }
}
