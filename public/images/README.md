# SweetCrumb image assets

Product images come from `public.products.image_url`, such as `/images/products/strawberry-dream.png`. Place the corresponding image in `public/images/products/`. The mapper accepts local `/images/` paths and the existing image component provides a graceful fallback when an asset is missing.

Category artwork stays configured in `src/app/core/data/categories.ts`. Hero artwork remains in the home template. Existing image assets are preserved.
