# CLAUDE.md — TraveLM AI Guide

## Project Overview

TraveLM — AI-powered travel planning app that generates personalized trip itineraries. Russian-language interface. Users create trips, get AI-generated day-by-day plans, view on maps, chat with AI assistant, share trips with friends.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS 4 + CSS variables, shadcn/ui (Radix UI + Lucide icons)
- **Backend**: Supabase (PostgreSQL, Auth, Real-time subscriptions, RLS)
- **AI**: DeepSeek (primary), OpenRouter/Qwen (fallback), Groq SDK
- **Maps**: Leaflet + React-Leaflet (CARTO Dark tiles)
- **Animation**: Framer Motion, Three.js, OGL (WebGL)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts

## Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build (standalone output)
npm run start    # Run production server
npm run lint     # ESLint
```

No test framework is configured.

## Project Structure

```
app/                    # Next.js App Router pages & API routes
  api/                  # API routes (deepseek, trip-assistant, flights, gallery, etc.)
  plan/                 # Trip creation form
  results/              # My trips listing
  trip/[id]/            # Trip detail page
  guide/                # AI guide chat
  profile/              # User profile
  admin/                # Admin panel
  auth/                 # OAuth callback
components/             # React components (~64 files)
  ui/                   # shadcn/ui primitives (Radix-based)
  ItineraryChatWidget.tsx  # Main chat widget for trip modifications
  TripMap.tsx           # Interactive Leaflet map
  TripChat.tsx          # Group chat with real-time subscriptions
  header.tsx            # Navigation header
  app-sidebar.tsx       # Sidebar navigation
lib/                    # Core utilities & services (~27 files)
  deepseek.ts           # DeepSeek API client + token tracking
  openrouter.ts         # OpenRouter fallback client
  supabase.ts           # Supabase auth helpers
  prompt-builder.ts     # AI prompt construction with dynamic context
  grounding.ts          # Ground truth data (closed airports, visa rules)
  strict-rules.ts       # Trip generation rules
  context/              # Dynamic context modules (flights, events, prices, trends)
types/
  database.types.ts     # Supabase auto-generated types
supabase/
  migrations/           # Database migrations
docs/                   # GitBook documentation
middleware.ts           # Admin subdomain auth middleware
```

## Key Architecture Patterns

### Components
- All components are `"use client"` (client-side React)
- Supabase real-time subscriptions for live updates (chat, trip sharing)
- `cn()` utility from `clsx` + `tailwind-merge` for className merging
- Dark mode via `next-themes`

### API Routes
- All in `app/api/*/route.ts` (Next.js App Router convention)
- Server-side AI calls, JSON request/response
- Pattern: validate input -> call AI/external API -> store in Supabase -> return JSON

### AI Pipeline
- `prompt-builder.ts` combines system + user prompts with dynamic context
- Context modules fetch flights, events, prices, trends in parallel
- Model selection: `deepseek-chat` for trips <= 7 days, `deepseek-reasoner` for 8+ days
- Fallback chain: DeepSeek -> OpenRouter (Qwen)
- `grounding.ts` provides 2026 ground truth (closed airports, visa rules)

### Database
- Supabase PostgreSQL with Row-Level Security (RLS)
- Main tables: `trips`, `trip_members`, `budget_expenses`, `voting_polls`
- JSON columns for complex data: `itinerary`, `safety_info`, `visa_advice`
- Types auto-generated in `types/database.types.ts`

## Naming Conventions

- **Components**: PascalCase, named exports
- **Utilities**: camelCase functions in `lib/`
- **API routes**: lowercase kebab-case directories (`api/feature-name/route.ts`)
- **Types/Interfaces**: PascalCase
- **Constants**: SCREAMING_SNAKE_CASE
- **Path alias**: `@/*` maps to project root

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase connection
- `DEEPSEEK_API_KEY` — Primary AI provider

Optional:
- `OPENROUTER_API_KEY` — Fallback AI provider
- `GROQ_API_KEY` — Fast inference
- `HUGGING_FACE_TOKEN` — HuggingFace models
- `TRAVELPAYOUTS_MARKER`, `TRAVELPAYOUTS_API_TOKEN` — Flight prices
- `GOOGLE_PLACES_API_KEY` — Real reviews

## Important Notes

- `next.config.mjs` has `ignoreBuildErrors: true` — TypeScript errors do not block builds
- `output: 'standalone'` for Docker deployment
- Image optimization is disabled (`unoptimized: true`)
- Admin panel is protected via subdomain middleware (`admin.*`) + Supabase role check
- Maintenance mode controlled via `app_settings` table in Supabase
- UI language is primarily Russian
