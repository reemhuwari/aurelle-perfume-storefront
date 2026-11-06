# أوريل Aurelle — Angular 20 + json-server (db.json)

## التشغيل (Node 20+)
npm install
npm run dev        ← يشغّل json-server (3000) و Angular (4200) معاً
  أو كل واحد بنافذة:  npm run api   و   npm start

مستخدم تجريبي: demo@aurelle.com / 123456

## الهيكل
src/app/
  core/    models/ (perfume, user, order) · services/ (perfume, auth, favorite, cart, order, toast) · guards/auth.guard.ts · utils/error.ts
  features/ home · perfumes/(perfume-list, perfume-detail) · cart · auth/(login, register) · account/(orders, favorites)
  shared/components/ navbar · footer · perfume-card · bottle (3D) · toast
public/models/bottle.glb   ← موديل الزجاجة
db.json                    ← perfumes, users, favorites, orders
src/styles/                ← _variables, _base, _layout, _components (scss)

## روابط json-server المستخدمة
GET /perfumes · GET /users?email=&password= · POST /users
GET/POST /favorites?userId= · DELETE /favorites/:id
GET /orders?userId=&_sort=createdAt&_order=desc · POST /orders

## الحركة (GSAP + Lenis)
npm install يثبّت gsap و lenis (موجودتان في package.json).
- core/services/motion.service.ts : يشغّل Lenis ويربطه بـ ScrollTrigger (حلقة واحدة)، ويحترم prefers-reduced-motion
- shared/directives/ : reveal (ظهور عند التمرير) · split-text (كلمات، لا حروف، حفاظاً على العربية) · magnetic · spotlight
- features/home/home.ts : timeline قصة الزجاجة (دخول + طفو + تمرير)
- styles/_motion.scss : تنسيق القصة (.story / .stage sticky) والحركات الأخرى
زجاجة الهيرو من صورتك الحقيقية (2D، بلا Three.js): shared/components/hero-bottle
  - الطبقتان: public/images/hero/aurelle-body.webp (الزجاجة) و aurelle-head.webp (رأس المضخة، يُضغط عند الرشّ)
  - رشّة افتتاحية بعد الدخول، وزر «جرّب الرشّة»، ورشّة عند كل فصل أثناء التمرير للأسفل (قمّة/قلب/قاعدة)
  - لتبديل الصورة: أعد قصّ الطبقتين بنفس المقاس (540×1067) وعدّل NOZZLE وإحداثيات <image> داخل hero-bottle.ts
صور العطور: حط صورك في public/images/perfumes، وفي db.json يشير حقل image لكل عطر لملفه (26 عطراً مربوطاً حالياً).
  أي عطر بدون صورة حقيقية يستخدم رسماً احتياطياً من public/images/art (56 ملف SVG). لا تحذفه.
  لإعادة توليد الرسومات الاحتياطية: python tools/make_bottles.py (لا يمسّ صورك الحقيقية في db.json)
صفحة تفاصيل العطر ما زالت تستخدم الزجاجة ثلاثية الأبعاد (three + bottle.glb).

## تنبيه
كلمات المرور في db.json نص عادي، وأسعار الطلب تُحسب في المتصفح. هذا مقبول للتطوير والتجربة فقط، وليس للإنتاج.
