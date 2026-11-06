import { HttpErrorResponse } from '@angular/common/http';

/** رسالة خطأ مفهومة للمستخدم */
export function errorMessage(e: unknown): string {
  if (e instanceof HttpErrorResponse) return 'تعذّر الاتصال بالسيرفر. تأكد أن json-server شغّال (npm run api).';
  return e instanceof Error ? e.message : 'حدث خطأ، حاول مرة أخرى.';
}
