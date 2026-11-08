# AURELLE — Luxury Perfume Storefront

A modern, Arabic-first (RTL) perfume e-commerce front-end built with **Angular 20**, focused on **motion design, product storytelling, and an app-like experience**.

The experience features an interactive hero bottle that sprays as users scroll, a 56-product catalog, dedicated product pages, authentication, favorites, cart, order history, and an installable desktop experience through Google Chrome.

> **Portfolio project.** The backend is a mock REST API (`json-server`) and is **not production-ready**. See [Limitations](#limitations).

## Table of contents

- [Highlights](#highlights)
- [Tech stack](#tech-stack)
- [AI-assisted development](#ai-assisted-development)
- [Progressive Web App (PWA)](#progressive-web-app-pwa)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Routes](#routes)
- [Project structure](#project-structure)
- [How the motion system works](#how-the-motion-system-works)
- [Data model](#data-model)
- [Adding product photos](#adding-product-photos)
- [Accessibility and performance](#accessibility-and-performance)
- [Limitations](#limitations)
- [Roadmap](#roadmap)
- [Author](#author)

## Highlights

- **Scroll-storytelling hero.** A real product photo is split into two layers (bottle body and pump head). The pump presses and a mist cloud is emitted from the nozzle on page load, on button click, and as each scent chapter (top, heart, base notes) enters while scrolling.
- **Catalog and filters.** 56 perfumes in 6 olfactory families, text search, and family filtering through query parameters (`/perfumes?family=...`).
- **One URL per product.** Scent pyramid, longevity and sillage bars, size selector, and a real photo (or a 3D bottle fallback).
- **Accounts.** Sign up and sign in, plus a protected `/account` area with orders and favorites.
- **Cart and orders.** A persisted cart and a checkout that stores the order for the signed-in user.
- **Motion system.** Smooth scrolling, scroll-linked timelines, word-level text reveal, magnetic buttons, cursor spotlight on cards, and route transitions.
- **RTL and responsive.** Designed Arabic-first, with layouts for desktop, tablet, and mobile.
- **Installable desktop app (PWA).** Configured as a Progressive Web App, allowing users to install AURELLE through Google Chrome and launch it in a standalone window with its own application icon.

## Tech stack

| Area | Tools |
|---|---|
| Framework | Angular 20 (standalone components, signals, new control flow, lazy-loaded routes, functional guards), TypeScript (strict mode), RxJS |
| Motion | GSAP + ScrollTrigger, Lenis (smooth scroll), View Transitions API, custom Angular directives |
| 3D | Three.js (GLTFLoader, GLB model) used as the product-page fallback |
| Styling | SCSS (partials in `src/styles`), CSS custom properties, CSS Grid and Flexbox, `clamp()`, `color-mix()`, `backdrop-filter`, inline SVG, responsive RTL layout |
| Typography | Amiri and Tajawal (Google Fonts) |
| Data and API | `json-server` (`db.json`) consumed through Angular `HttpClient` |
| PWA | Angular Service Worker, Web App Manifest, installable desktop experience |
| Image pipeline | Python (OpenCV GrabCut, Pillow), Playwright (rendering checks), WebP |
| Tooling | Node.js, Angular CLI, VS Code, Git and GitHub |
| AI assistance | Claude (code drafting and debugging), Gemini (product imagery), GitHub Copilot (targeted fixes) |

## AI-assisted development

AI tools were used as **assistants**, not as replacements for the development process.

I used them selectively for:
- Exploring implementation ideas and drafting selected code.
- Debugging and investigating technical issues.
- Generating and editing selected product imagery.
- Targeted code suggestions and improvements.

Architecture, integration, code review, testing, debugging, styling, and technical decisions were handled by me.

Product images shown in the demo are AI-generated or AI-edited and are **not real AURELLE products**.

## Progressive Web App (PWA)

AURELLE is configured as an installable Progressive Web App (PWA), extending the experience beyond a regular browser tab.

### PWA features

- **Web App Manifest:** Defines application metadata, display behavior, theme colors, and application icons.
- **Angular Service Worker:** Integrated for service worker registration and application resource management.
- **Desktop installation:** Tested locally through Google Chrome.
- **Standalone experience:** Opens in a dedicated application window with its own icon.

### Installation

To test the desktop installation locally:

1. Build the production version:

   ```bash
   ng build
   ```

2. Serve the generated production files:

   ```bash
   npx http-server dist/aurelle/browser -p 8080
   ```

3. Open the application in Google Chrome:

   ```text
   http://localhost:8080
   ```

4. Open the Chrome menu and select **Install AURELLE** or **Install page as app**, when available.

> **Testing note:** Desktop installation was tested locally using Google Chrome. Mobile installation and production deployment are not yet verified.

## Getting started

**Requirements:** Node.js 20 or newer.

### 1. Clone the repository

```bash
git clone https://github.com/reemhuwari/aurelle-angular-v4.git
cd aurelle-angular-v4/aurelle-ng
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the application

```bash
npm run dev
```

This starts the mock API and Angular development server together.

Open:

```text
http://localhost:4200
```

**Demo account:**

- Email: `demo@aurelle.com`
- Password: `123456`

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the mock API and Angular dev server together |
| `npm run api` | Start only the mock API (`db.json`, port 3000) |
| `npm start` | Start only the Angular dev server (port 4200) |
| `npm run build` | Production build into `dist/` |
| `npm run link-images` | Match images in `public/images/perfumes` to perfumes in `db.json` |
| `npm run glb` | Regenerate the placeholder GLB bottle (requires Python) |

## Routes

| Path | Page | Access |
|---|---|---|
| `/` | Home: scroll-story hero, featured perfumes, families | Public |
| `/perfumes` | Catalog with search and `?family=` filter | Public |
| `/perfumes/:slug` | Product page | Public |
| `/cart` | Cart and checkout | Public (checkout requires sign-in) |
| `/login`, `/register` | Authentication | Public |
| `/account/orders`, `/account/favorites` | Account area | Signed-in users only |

## Project structure

```text
src/app
├─ core/       models, services (perfume, auth, favorite, cart, order, toast, motion), guards, utils
├─ features/   home, perfumes (list, detail), cart, auth (login, register), account (orders, favorites)
└─ shared/     components (navbar, footer, perfume-card, hero-bottle, bottle-art, 3D bottle, toast)
               directives (reveal, split-text, magnetic, spotlight)

src/styles     _variables, _base, _layout, _components, _motion (SCSS partials)
public/images  hero/ (bottle layers), perfumes/ (product photos), art/ (vector fallbacks)
db.json        perfumes, users, favorites, orders
tools/         asset scripts (image linking, fallback art, GLB generation)
```

## How the motion system works

- **One animation loop.** Lenis is driven by the GSAP ticker and linked to ScrollTrigger, so smooth scrolling and scroll-linked animation stay in sync.
- **Outside Angular's change detection.** GSAP and Lenis run inside `NgZone.runOutsideAngular`, so animation frames do not trigger change detection.
- **Sticky story stage.** The hero is a tall section with a `position: sticky` stage. A single scrubbed GSAP timeline moves the bottle between chapters, and the stage is released naturally when the section ends.
- **Layered bottle.** The photo is split into a body layer and a pump-head layer so the pump can press independently. The mist is rendered as blurred SVG circles emitted from the nozzle position.
- **Arabic-safe text animation.** Headlines are split by **word**, not by letter, because splitting letters breaks Arabic letter joining.
- **Reduced motion.** With `prefers-reduced-motion`, smooth scrolling and timelines are disabled and the story section falls back to a normal, readable layout.

## Data model

```jsonc
// db.json
{
  "perfumes": [{
    "id": 1,
    "slug": "rose-royale",
    "name": "...",
    "family": "...",
    "color": "#d9567c",
    "top": ["..."],
    "heart": ["..."],
    "base": ["..."],
    "longevity": 90,
    "sillage": 75,
    "season": "...",
    "description": "...",
    "sizes": [
      { "ml": 2, "price": 8 },
      { "ml": 50, "price": 185 }
    ],
    "image": "images/perfumes/example.jpg"
  }],
  "users": [],
  "favorites": [],
  "orders": []
}
```

## Adding product photos

1. Put images in `public/images/perfumes/`.
2. Run `npm run link-images`. File names are matched to perfume slugs (case and small typos are tolerated) and the `image` field in `db.json` is updated.
3. Hard refresh the browser. Restart `ng serve` if you added new files to `public/`.

Perfumes without a photo fall back to a generated vector bottle in `public/images/art/`.

## Accessibility and performance

- Respects `prefers-reduced-motion`.
- ARIA labels on interactive controls and decorative elements hidden from assistive technology.
- Lazy-loaded routes, WebP hero assets, and lazy-loaded product images.
- Heavy animation work kept outside Angular's change detection.

## Limitations

- **Authentication is for demo purposes only.** `json-server` stores passwords in plain text and the client calculates order totals. A real backend must hash passwords, issue tokens, and price orders on the server.
- Data created while testing is written to `db.json`. Reset it before committing if it contains personal data.
- Some product labels in AI-generated images contain typos. They were kept as generated and should be regenerated before any real use.
- Images are demo assets. Check licensing before reusing them commercially.
- No automated tests yet.
- **PWA deployment:** The PWA has been tested locally on desktop Chrome. HTTPS hosting, mobile installation, and production service-worker behavior still need verification.

## Roadmap

- Real backend (Node.js or NestJS with a database), hashed passwords and JWT authentication.
- Admin dashboard for products and orders.
- Unit and end-to-end tests.
- Hosted deployment with a live API.
- Verify PWA installation and behavior on Android and iOS.
- Production deployment with HTTPS and optimized caching.

## Author

**Reem Huwari** — Front-End Developer

LinkedIn: https://www.linkedin.com/in/reem-huwari-0136a0263

GitHub: https://github.com/reemhuwari
