# Stitch «Вайб поездки» — исходники в репозитории

Экспорт из Stitch лежит в **`scripts/Vibe/`**:

| Файл | Назначение |
|------|------------|
| `code.html` | HTML + Tailwind (CDN), Material Symbols, цветовые токены |
| `DESIGN.md` | Design system «Digital Scrapbook / Expressive Explorer» |
| `screen.png` | Превью экрана |

Реализация **`/plan/vibe`** перенесена в Next.js: шрифты **Epilogue** + **Plus Jakarta Sans** (`next/font/google`), палитра и компоновка из `code.html`, без лишней навигации Explorer (остаётся наш `AppLayout`).

Программная выгрузка через `@google/stitch-sdk` возможна при наличии `STITCH_API_KEY` (см. README пакета).
