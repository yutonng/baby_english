# Little English UI Style

This app uses the Figma Make design as the source of truth for the home scene list:
`https://www.figma.com/make/SzAdVrhNQkgvA1JRXl8ft0/儿童学习英语-APP`

## Layout

- Mobile-first H5 layout, max content width around 464px.
- App background follows Figma Make `theme.css`: `#FFF7ED`.
- Home scene selector uses vertical list cards, not large marketing tiles.
- Cards are white, lightly elevated, and easy to scan. They should feel like compact list rows, not large tiles.
- Each scene card has:
  - a 64px pastel square icon block on the left
  - Chinese title first
  - English subtitle and word count second
  - a 32px circular pastel arrow on the right
  - exact card shadow: `0 2px 12px rgba(45,27,105,0.08)`

## Visual Tone

- Friendly, calm, and polished.
- Avoid busy decoration, large hero sections, gradient blobs, and heavy shadows.
- Use `#2D1B69` for important titles and arrow icons.
- Use `#9B8BB4` for secondary text.
- Use rounded UI, but keep controls simple and familiar.
- Avoid adding a hero/header to the home scene list unless the Figma design changes.

## Word Images

- Word illustrations use local SVG assets.
- Current illustration style is sticker-like, softly realistic, with clear outlines.
- SVGs should stay simple, centered, and readable at small sizes.
- No text inside images.
- Prefer concrete object drawings over abstract symbols.

## Controls

- Back and close buttons are white rounded controls with subtle shadows.
- Play rows are soft pastel rounded panels with a circular play icon.
- Keep tap targets large enough for young children.

## File Guidance

- Main styling lives in `styles.css`.
- Scene and word data lives in `app.js`.
- Sticker SVG generation lives in `scripts/generate-sticker-svgs.js`.
