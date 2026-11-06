import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  template: `@if (toast.msg()) { <div class="toast" role="status">{{ toast.msg() }}</div> }`
})
export class Toast { toast = inject(ToastService); }
