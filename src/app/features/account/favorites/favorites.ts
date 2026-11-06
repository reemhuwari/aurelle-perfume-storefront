import { Component, computed, inject } from '@angular/core';
import { PerfumeService } from '../../../core/services/perfume.service';
import { FavoriteService } from '../../../core/services/favorite.service';
import { PerfumeCard } from '../../../shared/components/perfume-card/perfume-card';

@Component({ selector: 'app-favorites', imports: [PerfumeCard], templateUrl: './favorites.html' })
export class Favorites {
  private perfumes = inject(PerfumeService); private fav = inject(FavoriteService);
  list = computed(() => this.perfumes.perfumes().filter(p => this.fav.ids().includes(p.id)));
}
