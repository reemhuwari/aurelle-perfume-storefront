import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionUser, User } from '../models/user.model';

const KEY = 'aur_user';

/** ملاحظة: تسجيل الدخول هنا بطريقة json-server (استعلام على db.json) — مناسب للتطوير فقط. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private url = `${environment.apiUrl}/users`;
  readonly user = signal<SessionUser | null>(this.restore());

  private restore(): SessionUser | null { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
  private start(u: User) {
    const { password, ...session } = u;
    localStorage.setItem(KEY, JSON.stringify(session)); this.user.set(session);
  }
  async login(email: string, password: string) {
    const res = await firstValueFrom(this.http.get<User[]>(this.url, { params: { email: email.trim().toLowerCase(), password } }));
    if (!res.length) throw new Error('البريد أو كلمة المرور غير صحيحة');
    this.start(res[0]);
  }
  async register(name: string, email: string, password: string) {
    const em = email.trim().toLowerCase();
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(em) || password.length < 6) throw new Error('تحقق من الاسم والبريد وكلمة المرور (6 أحرف على الأقل)');
    const exists = await firstValueFrom(this.http.get<User[]>(this.url, { params: { email: em } }));
    if (exists.length) throw new Error('هذا البريد مسجّل مسبقاً');
    this.start(await firstValueFrom(this.http.post<User>(this.url, { name: name.trim(), email: em, password, createdAt: new Date().toISOString() })));
  }
  logout() { localStorage.removeItem(KEY); this.user.set(null); this.router.navigate(['/']); }
  /** يحوّل لصفحة الدخول إن لم يكن المستخدم مسجّلاً */
  requireLogin(): boolean {
    if (this.user()) return true;
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    return false;
  }
}
