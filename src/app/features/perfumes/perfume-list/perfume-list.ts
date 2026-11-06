import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PerfumeService } from '../../../core/services/perfume.service';
import { PerfumeCard } from '../../../shared/components/perfume-card/perfume-card';

@Component({ selector: 'app-perfume-list', imports: [RouterLink, PerfumeCard], templateUrl: './perfume-list.html' })
export class PerfumeList {
  private svc = inject(PerfumeService);
  family = input<string>();          // من ?family= في الرابط
  q = signal('');
  families = this.svc.families;
  familyName = computed(() => this.svc.familyName(this.family()));
  list = computed(() => this.svc.familyProducts(this.family()).filter(p =>
    !this.q() || p.name.includes(this.q())));
}
