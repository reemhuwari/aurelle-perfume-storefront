import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({ selector: 'app-account', imports: [RouterLink, RouterLinkActive, RouterOutlet], templateUrl: './account.html' })
export class Account { auth = inject(AuthService); }
