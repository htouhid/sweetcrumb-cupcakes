# SweetCrumb image assets

The SVG illustrations are local visual placeholders. Replace them with final photography whenever ready.

- `products/`: product files referenced by `src/app/core/data/products.ts` (currently `<slug>.svg`). Update the image extension/path there when adding JPG, PNG, or WebP photos.
- `categories/`: four collection images referenced by `CATEGORIES` in that same file.
- `hero/`: `cupcake-collection.svg`, referenced in the home template. Update its path and alt text when replacing the illustration.

ProductImageComponent displays a branded fallback if an image cannot load. No remote image requests are used.
