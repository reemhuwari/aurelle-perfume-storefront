import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly msg = signal('');
  private t?: ReturnType<typeof setTimeout>;
  show(text: string) { this.msg.set(text); clearTimeout(this.t); this.t = setTimeout(() => this.msg.set(''), 2400); }
}
