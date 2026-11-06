import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Perfume } from '../models/perfume.model';

export interface PerfumeFamilyOption {
  slug: string;
  name: string;
}

const FAMILY_DEFINITIONS: readonly (PerfumeFamilyOption & { aliases: readonly string[] })[] = [
  { slug: 'floral', name: 'وردية', aliases: ['ورديّة', 'وردية', 'floral'] },
  { slug: 'oud', name: 'عودية', aliases: ['عودية', 'oud'] },
  { slug: 'citrus', name: 'حمضية', aliases: ['حمضية', 'citrus'] },
  { slug: 'oriental', name: 'شرقية', aliases: ['شرقية', 'oriental'] },
  { slug: 'woody', name: 'خشبية', aliases: ['خشبية', 'woody'] },
  { slug: 'aquatic', name: 'مائية', aliases: ['مائيّة', 'مائية', 'aquatic'] }
];

@Injectable({ providedIn: 'root' })
export class PerfumeService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/perfumes`;
  readonly perfumes = signal<Perfume[]>([]);
  readonly families = computed<PerfumeFamilyOption[]>(() => {
    const storedFamilies = [...new Set(this.perfumes().map(p => p.family))];
    const known = FAMILY_DEFINITIONS.map(({ slug, name }) => ({ slug, name }));
    const other = storedFamilies
      .filter(name => !this.definitionFor(name))
      .map(name => ({ slug: name.toLocaleLowerCase().replace(/\s+/g, '-'), name }));
    return [...known, ...other];
  });

  async load() {
    try { this.perfumes.set(await firstValueFrom(this.http.get<Perfume[]>(this.url))); }
    catch (e) { console.error('تعذّر تحميل العطور. شغّل: npm run api', e); }
  }

  familyProducts(identifier?: string) {
    return this.perfumes().filter(p => !identifier || this.matchesFamily(p.family, identifier));
  }

  familyName(identifier?: string) {
    if (!identifier) return undefined;
    return this.definitionFor(identifier)?.name
      ?? this.families().find(f => f.slug.toLocaleLowerCase() === identifier.trim().toLocaleLowerCase()
        || f.name.toLocaleLowerCase() === identifier.trim().toLocaleLowerCase())?.name;
  }

  private matchesFamily(productFamily: string, identifier: string) {
    const definition = this.definitionFor(identifier);
    if (definition) {
      const family = productFamily.trim().toLocaleLowerCase();
      return definition.aliases.some(alias => alias.toLocaleLowerCase() === family);
    }
    const option = this.families().find(family => family.slug.toLocaleLowerCase() === identifier.trim().toLocaleLowerCase());
    if (option) return productFamily.trim().toLocaleLowerCase() === option.name.trim().toLocaleLowerCase();
    return productFamily.trim().toLocaleLowerCase() === identifier.trim().toLocaleLowerCase();
  }

  private definitionFor(identifier: string) {
    const normalized = identifier.trim().toLocaleLowerCase();
    return FAMILY_DEFINITIONS.find(family =>
      family.slug.toLocaleLowerCase() === normalized
      || family.aliases.some(alias => alias.toLocaleLowerCase() === normalized));
  }

  bySlug(slug: string) { return this.perfumes().find(p => p.slug === slug); }
}
