import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { errorMessage } from '../../../core/utils/error';

@Component({ selector: 'app-login', imports: [FormsModule, RouterLink], templateUrl: './login.html' })
export class Login {
  private auth = inject(AuthService); private router = inject(Router);
  returnUrl = input('/account/orders');          // من ?returnUrl=
  email = ''; password = ''; error = signal(''); busy = signal(false);
  async submit() {
    this.busy.set(true); this.error.set('');
    try { await this.auth.login(this.email, this.password); this.router.navigateByUrl(this.returnUrl()); }
    catch (e) { this.error.set(errorMessage(e)); }
    finally { this.busy.set(false); }
  }
}
