# Image audit report

## Scope
- Audited public image directories: `public/images/art/` and `public/images/hero/`
- Checked product references in `db.json` and homepage usage in `src/app/features/home/home.html` and `src/app/shared/components/perfume-card/perfume-card.html`

## Discovered image assets
### Art assets (`public/images/art/`)
- `images/art/amber-oud.png`
- `images/art/black-patchouli.png`
- `images/art/black-vanilla.png`
- `images/art/blue-wave.png`
- `images/art/cedar-tobacco.png`
- `images/art/cedar-wood.png`
- `images/art/cinnamon-honey.jpg`
- `images/art/citrus-breeze.jpg`
- `images/art/cloud-mist.jpg`
- `images/art/cloud-oud.jpg`
- `images/art/cypress-shade.jpg`
- `images/art/damascus-nights.jpg`
- `images/art/damask-night.jpg`
- `images/art/date-cardamom.jpg`
- `images/art/dawn-petals.jpg`
- `images/art/desert-oud.jpg`
- `images/art/evening-bloom.png`
- `images/art/evening-incense.jpg`
- `images/art/fajr-lemon.jpg`
- `images/art/glacier.png`
- `images/art/golden-sandalwood.png`
- `images/art/harbor-breeze.jpg`
- `images/art/harbor-lemon.png`
- `images/art/jouri-gardens.png`
- `images/art/lake.jpg`
- `images/art/morning-dew.jpg`
- `images/art/morning-fig.jpg`
- `images/art/morning-orange.jpg`
- `images/art/old-oak.jpg`
- `images/art/orient-amber.jpg`
- `images/art/oud-al-layl.jpg`
- `images/art/oud-smoke.jpg`
- `images/art/pearl.jpg`
- `images/art/pine-forest.jpg`
- `images/art/pink-grapefruit.webp`
- `images/art/resin-wood.jpg`
- `images/art/root-wood.jpg`
- `images/art/rose-royale.webp`
- `images/art/rose-whisper.jpg`
- `images/art/royal-oud.jpg`
- `images/art/ruby-rose.jpg`
- `images/art/saffron-night.jpg`
- `images/art/salt-sand.jpg`
- `images/art/sea-spray.png`
- `images/art/silk-musk.jpg`
- `images/art/spring-rain.png`
- `images/art/springs.jpg`
- `images/art/sun-bergamot.jpg`
- `images/art/sunset-shore.jpg`
- `images/art/sunset-wood.webp`
- `images/art/taif-rose.png`
- `images/art/vetiver-noir.jpg`
- `images/art/walnut-wood.jpg`
- `images/art/white-oud.webp`

### Hero assets (`public/images/hero/`)
- `images/hero/aurelle-body.webp`
- `images/hero/aurelle-head.webp`
- `images/hero/aurelle-cap.png`
- `images/hero/hero-cherry-blossoms.jpg`
- `images/hero/hero-mauve-white-roses.jpg`
- `images/hero/hero-pink-rose-closeup.jpg`
- `images/hero/hero-white-pink-roses.jpg`

## Used vs unused
- All 54 images under `public/images/art/` are now mapped to real product entries in `db.json`.
- The bottle body and four floral photos are used by the Hero story; `aurelle-cap.png` is used as the separate animated cap. `aurelle-head.webp` is retained as the opaque extraction source.
- The hero images are not part of the product catalog data.
- Previously broken product URLs were caused by mismatched extensions (`.png`, `.jpg`, `.webp`) and were corrected to the existing asset files on disk.

## Previously broken mappings fixed
- Fajr Lemon: `images/art/fajr-lemon.jpg` (corrected from .webp)
- Rose Whisper: `images/art/rose-whisper.jpg` (corrected from .png)
- Royal Oud: `images/art/royal-oud.jpg` (corrected from .webp)
- Pink Grapefruit: `images/art/pink-grapefruit.webp` (corrected from .jpg)
- Sun Bergamot: `images/art/sun-bergamot.jpg` (corrected from .png)
- Salt & Sand: `images/art/salt-sand.jpg` (corrected from .webp)
- Sunset Wood: `images/art/sunset-wood.webp` (corrected from .jpg)
- Evening Incense: `images/art/evening-incense.jpg` (corrected from .png)

## Missing or unidentified assets
- No product image assets remain missing after the mapping repair.
- No unidentified perfume photos were guessed; all known photo assets were matched to the correct product by filename and family.
- The story hero images are intentionally editorial and do not correspond to specific perfume products in the catalog.

## Remaining issues
- The site still relies on several editorial hero visuals for the fixed story layout; they are functional and intentionally separate from product photos.
- Future product additions should keep filenames in sync with the actual files in `public/images/art/` to avoid broken image URLs.
