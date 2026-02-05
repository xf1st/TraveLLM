# CLAUDE.md — TraveLM AI Travel Planner

## Project Overview

TraveLM is an AI-powered travel planning platform built for the Russian-speaking market. Users input travel preferences (destination, budget, dates, style) and receive AI-generated itineraries with daily activities, cost breakdowns, maps, and contextual chat assistance. The app includes 2026 travel grounding data (sanctions, flight routes, airport statuses) to produce realistic plans.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.0.10 |
| Language | TypeScript (strict mode) | 5.x |
| UI Library | React | 19.2.0 |
| Styling | Tailwind CSS v4 + OKLCH color system | 4.1.9 |
| Components | shadcn/ui (new-york style) + Radix UI | Various |
| Database | Supabase (PostgreSQL + Auth + Realtime) | 2.90.1 |
| Maps | Leaflet + React-Leaflet + OpenStreetMap | 1.9.4 / 5.0.0 |
| 3D/Effects | Three.js + @react-three/fiber + OGL | 0.182.0 |
| Animation | Framer Motion | 12.29.0 |
| Icons | Lucide React | 0.454.0 |
| Charts | Recharts | 2.15.4 |
| Forms | react-hook-form | 7.60.0 |
| Analytics | Vercel Analytics + Yandex.Metrika | — |

## AI Model Architecture

Trip generation uses a multi-provider fallback strategy:

| Provider | Role | Model | File |
|----------|------|-------|------|
| DeepSeek | **Primary** — trip itinerary generation | deepseek-chat | `lib/deepseek.ts` |
| OpenRouter | **Fallback** for trip gen; **Primary** for guide chat | Qwen 2.5-72B | `lib/openrouter.ts` |
| HuggingFace | Free-tier fallback inference | Llama-3.1-8B | `lib/huggingface.ts` |
| Qwen | Secondary inference | Qwen-3-32B | `lib/qwen.ts` |
| Groq | Legacy (still in deps) | Llama-3.3-70B | `lib/groq.ts` |
| Cerebras | Disabled (cost) | GLM-4.7 | `lib/cerebras.ts` |

The main itinerary generation endpoint is `app/api/groq/route.ts` (named "groq" for historical reasons but uses DeepSeek/OpenRouter).

## Directory Structure

```
app/                        # Next.js App Router pages & API
├── api/
│   ├── groq/route.ts       # Main itinerary generation API
│   ├── guide-chat/route.ts # AI chat for trip guidance
│   ├── image/route.ts      # Image proxy (Wikimedia)
│   ├── gallery/route.ts    # Gallery management
│   └── modify-itinerary/route.ts
├── auth/                   # Auth pages (login, signup, callback)
├── plan/page.tsx           # Trip planning form
├── trip/                   # Trip details & views
├── guide/                  # Guide pages
├── profile/                # User profile
├── onboarding/             # Onboarding flow
├── demo/                   # Demo mode
├── results/                # Search results
├── news/                   # Articles/news
├── support/, terms/, privacy/
├── layout.tsx              # Root layout (metadata, providers)
├── page.tsx                # Landing page
└── globals.css             # Global Tailwind + CSS vars

components/
├── ui/                     # shadcn/ui primitives (24+ components)
├── TripMap.tsx             # Leaflet interactive map
├── TripChat.tsx            # Trip chat widget
├── ItineraryChatWidget.tsx # Itinerary-specific chat
├── GuideChatWidget.tsx     # Guide AI chat
├── Aurora.tsx              # WebGL aurora background
├── Prism.tsx               # 3D prism effect
├── LightRays.tsx           # Ray tracing effect
├── GeneratingModal.tsx     # Loading/generating overlay
├── TripShareModal.tsx      # Trip sharing dialog
├── PlaceGallery.tsx        # Image gallery for places
├── app-layout.tsx          # App wrapper with sidebar
├── app-sidebar.tsx         # Navigation sidebar
├── header.tsx / footer.tsx # Header and footer
└── theme-provider.tsx      # Dark/light theme context

lib/
├── supabase.ts             # Supabase client, auth helpers
├── openrouter.ts           # OpenRouter API client
├── deepseek.ts             # DeepSeek API client
├── huggingface.ts          # HuggingFace inference
├── cerebras.ts             # Cerebras client (disabled)
├── groq.ts                 # Groq SDK client (legacy)
├── qwen.ts                 # Qwen model client
├── grounding.ts            # 2026 travel data & restrictions
├── images.ts               # Wikimedia image search + fallbacks
├── articles.ts             # Article/news database
├── mock-data.ts            # Demo/mock data
└── utils.ts                # cn() helper, misc utilities

supabase/migrations/        # Database schema migrations
docs/                       # Project documentation (GitBook)
scripts/                    # Utility scripts
public/images/              # Static destination images
styles/globals.css          # Additional global styles
```

## Development Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Production build (standalone output)
npm run start    # Run production server
npm run lint     # ESLint check
```

## Key Configuration

- **`next.config.mjs`**: `ignoreBuildErrors: true`, `images.unoptimized: true`, `output: 'standalone'`
- **`tsconfig.json`**: ES6 target, strict mode, `@/*` path alias maps to project root
- **`components.json`**: shadcn/ui with new-york style, Lucide icons, CSS variables enabled
- **`postcss.config.mjs`**: Tailwind v4 PostCSS plugin
- **Middleware** (`middleware.ts`): Disabled — auth handled client-side

## Environment Variables

All API keys have hardcoded fallback defaults in the source files (for development). Override via `.env.local` for production:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DEEPSEEK_API_KEY=...
OPENROUTER_API_KEY=...
HUGGING_FACE_TOKEN=...
GROQ_API_KEY=...
```

## Database Schema (Supabase)

Key tables:
- **`trips`** — Trip records (id, user_id, data JSON, status, bookings, completed_activities)
- **`trip_members`** — Collaboration roles (trip_id, user_id, role: owner/editor/viewer)
- **`profiles`** — User profiles with preferences
- **`messages`** — Chat message history
- **`invite_code`** — Link-based trip sharing

Auth: Supabase Auth with Google OAuth, GitHub OAuth, email/password, and magic links.

## Coding Conventions

### File Naming
- **Pages**: `page.tsx` (Next.js App Router convention)
- **Components**: PascalCase filenames (`TripMap.tsx`, `GuideChatWidget.tsx`)
- **API routes**: kebab-case directories with `route.ts` (`api/guide-chat/route.ts`)
- **Utilities/services**: camelCase filenames (`supabase.ts`, `openrouter.ts`)

### Component Structure
1. `"use client"` directive (if interactive)
2. Imports
3. Type/interface definitions
4. Component function with hooks, handlers, JSX
5. `export default`

WebGL/3D components use `dynamic()` import with `{ ssr: false }`:
```tsx
const Aurora = dynamic(() => import('@/components/Aurora'), { ssr: false })
```

### Styling
- Tailwind utility classes as the primary approach
- `cn()` from `lib/utils.ts` for conditional class merging (clsx + tailwind-merge)
- OKLCH color system defined as CSS custom properties in `globals.css`
- Dark/light mode via `next-themes` and CSS variables
- No CSS modules or styled-components

### State Management
- `useState`/`useEffect` hooks (no Redux or Zustand)
- Supabase queries for server state
- `localStorage` for user preferences (`userPreferences` key)

### Error Handling
- Try-catch blocks around all API calls
- `sonner` toast notifications for user feedback
- `NextResponse.json()` with status codes for API errors
- Graceful degradation with fallback images and data

### Language
- UI text and AI prompts are in **Russian**
- Code comments are a mix of Russian and English
- Variable names and code identifiers are in English

## API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/groq` | POST | Generate trip itinerary (DeepSeek primary, OpenRouter fallback) |
| `/api/guide-chat` | POST | AI guide chat (OpenRouter/Qwen) |
| `/api/image` | GET | Image proxy via Wikimedia Commons |
| `/api/gallery` | GET | Photo gallery for destinations |
| `/api/modify-itinerary` | POST | Modify existing itinerary |

### Budget Logic (in `/api/groq/route.ts`)
- **Economy**: ~7,500 RUB/day (hostels, public transport, free activities)
- **Comfort**: ~20,000 RUB/day (3-4* hotels, taxis, restaurants)
- **Premium**: ~50,000 RUB/day (5* hotels, VIP services)
- **Custom**: User-specified amount in RUB

## Testing

No formal testing framework is currently configured. There are no test files, no Jest/Vitest/Cypress setup. The only automated check is `npm run lint`.

## Deployment

The project supports multiple deployment targets:
- **Timeweb Cloud** (primary, documented in `DEPLOYMENT_GUIDE.md`)
- **Docker/Kubernetes** (standalone Next.js output)
- **VDS/Ubuntu** (Node.js + PM2)
- **Vercel** (native Next.js support)
- **Netlify** (legacy guide in `NETLIFY_DEPLOY.md`)

## Important Caveats

1. **`app/api/groq/route.ts` is misnamed** — it uses DeepSeek (primary) and OpenRouter (fallback), not Groq. The name is historical.
2. **TypeScript build errors are ignored** (`ignoreBuildErrors: true` in next.config) — the build will succeed even with type errors.
3. **API keys are hardcoded as fallback defaults** in `lib/*.ts` files — these are development keys and should be overridden via environment variables in production.
4. **Middleware is disabled** — all auth checks happen client-side via Supabase.
5. **The app is Russian-language-first** — AI prompts, UI strings, and documentation are primarily in Russian.
6. **Grounding data** in `lib/grounding.ts` contains 2026-specific travel info (sanctions, airport closures, visa requirements) used to make AI responses realistic.

## Documentation

- `README.md` — Project overview
- `ai_architecture.md` — AI model configuration and prompt engineering
- `DEPLOYMENT_GUIDE.md` — Timeweb Cloud deployment (3 methods)
- `OAUTH_SETUP.md` — OAuth provider configuration
- `Roadmap.md` / `Roadmap_Status.md` — Feature roadmap and status
- `docs/` — GitBook-structured user and developer documentation
