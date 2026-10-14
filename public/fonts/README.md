# Local font assets

The WOFF2 files are the same unmodified subsets previously downloaded by this
project's `next/font/google` loaders. `app/fonts.css` retains their Unicode ranges,
variable weights and fallback metrics. Only the main Rubik Latin/Cyrillic faces are
preloaded; other subsets load when the page uses their characters/families.

Font copyright notices and SIL Open Font License texts are in `licenses/`.
Upstream license sources:

- [Rubik](https://github.com/google/fonts/blob/main/ofl/rubik/OFL.txt)
- [JetBrains Mono](https://github.com/google/fonts/blob/main/ofl/jetbrainsmono/OFL.txt)
- [Space Grotesk](https://github.com/google/fonts/blob/main/ofl/spacegrotesk/OFL.txt)
- [Plus Jakarta Sans](https://github.com/google/fonts/blob/main/ofl/plusjakartasans/OFL.txt)
- [Epilogue](https://github.com/google/fonts/blob/main/ofl/epilogue/OFL.txt)

Keep the corresponding license when updating a font. Update the cached asset and
its CSS declaration together. No Google Fonts network requests are required at
build time or in the browser.
