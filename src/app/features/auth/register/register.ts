import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { errorMessage } from '../../../core/utils/error';

@Component({ selector: 'app-register', imports: [FormsModule, RouterLink], templateUrl: './register.html' })
export class Register {
  private auth = inject(AuthService); private router = inject(Router);
  returnUrl = input('/account/orders');
  name = ''; email = ''; password = ''; error = signal(''); busy = signal(false);
  async submit() {
    this.busy.set(true); this.error.set('');
    try { await this.auth.register(this.name, this.email, this.password); this.router.navigateByUrl(this.returnUrl()); }
    catch (e) { this.error.set(errorMessage(e)); }
    finally { this.busy.set(false); }
  }
}
