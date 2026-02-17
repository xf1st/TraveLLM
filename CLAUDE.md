# CLAUDE.md — TraveLLM AI Guide

## Project Overview

TraveLLM — AI-powered travel planning app that generates personalized trip itineraries. Russian-language interface. Users create trips, get AI-generated day-by-day plans, view on maps (2D/3D), chat with AI assistant, and share trips with friends.

## Tech Stack

- **Framework**: Next.js 16.1 (App Router), React 19.2, TypeScript 5
- **Styling**: Tailwind CSS 4 + CSS variables, shadcn/ui (Radix UI + Lucide icons)
- **Production URL**: `https://travellm.ru`
- **Backend**: Supabase (PostgreSQL, Auth, Real-time subscriptions, RLS)
- **AI**:
  - **DeepSeek** (Primary: `deepseek-chat` / `deepseek-reasoner`)
  - **Hugging Face / Cerebras** (Fast Inference: `GLM-4.7`, `Llama-3.3-70B`)
  - **OpenRouter** (Fallback: Qwen 2.5)
  - **Groq** (Fast Inference)
- **Maps**:
  - **Leaflet** (Standard 2D)
  - **MapLibre GL** (Vector Maps, Dark Mode)
  - **Cesium** (3D Globe / Terrain)
  - **React-Globe.gl** (Holographic View)
- **Animation**: Framer Motion, Three.js, OGL (WebGL), Lottie, `tailwindcss-animate`
- **UI Components**: Sonner (Toasts), Vaul (Drawers), CMDK (Command Palette), Embla Carousel
- **Data & APIs**: TravelPayouts (Flights), OpenWeather (Weather), Google Places (Reviews)

## Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build (standalone output)
npm run start    # Run production server
npm run lint     # ESLint
```

## Project Structure

```
app/                    # Next.js App Router pages
  api/                  # API routes (deepseek, trip-assistant, flights, etc.)
  admin/                # Admin panel & stats
  dashboard/            # User dashboard
  guide/                # AI guide chat
  onboarding/           # User onboarding flow
  plan/                 # Trip creation form
  results/              # My trips listing
  trip/[id]/            # Trip detail page
  news/                 # Travel news/articles
  auth/                 # keycloak/oauth callbacks
components/             # React components
  ui/                   # shadcn/ui primitives
  travel/               # Map engines (Cesium, MapLibre, Globe), Flight prices
  itinerary/            # Trip timeline, activities
  social/               # Chat, Share modal, Achievements
  admin/                # Admin specific components
  Aurora.tsx            # Background shader effects
  PlaceGallery.tsx      # Location image gallery
  ViralSpotCard.tsx     # Trending location display
lib/                    # Core logic
  cerebras.ts           # Hugging Face/Cerebras inference client
  deepseek.ts           # DeepSeek API client
  openrouter.ts         # Qwen/OpenRouter fallback
  prompt-builder.ts     # AI Context injection
  travelpayouts.ts      # Flight price API
  weather.ts            # Weather data fetching
  supabase.ts           # Auth & DB helpers
  strict-rules.ts       # JSON generation constraints
types/                  # TypeScript definitions
  database.types.ts     # Supabase generated types
supabase/
  migrations/           # SQL migrations
```

## Key Architecture Patterns

### Components

- **Client-First**: Most components are `"use client"` for interactivity.
- **Real-Time**: Heavy use of Supabase Realtime for chat, cursors, and state sync.
- **Hybrid Maps**: context-aware switching between Leaflet (lightweight), MapLibre (detailed), and Cesium (immersive).
- **Theming**: Deep dark mode using OKLCH colors and Tailwind v4 variables.

### AI Pipeline

1. **Context Assembly**: `prompt-builder.ts` aggregates user prefs, flight data, and local events.
2. **Model Selection**:
   - Complex planning -> DeepSeek Reasoner
   - Quick chats/edits -> Cerebras (GLM-4.7) or Groq
   - Fallback -> OpenRouter (Qwen)
3. **Validation**: `strict-rules.ts` and `grounding.ts` ensure valid JSON and realistic constraints (e.g., operating hours).

### Database

- **Supabase**: PostgreSQL with RLS.
- **JSONB**: Extensive use of JSONB for storing flexible itinerary structures (`day_plans`, `activities`).
- **Tables**: `trips`, `trip_members`, `messages`, `achievements`, `viral_spots`.

## Environment Variables

### Required

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DEEPSEEK_API_KEY`

### Optional / Feature-Specific

- `HUGGING_FACE_TOKEN` (for Cerebras/GLM-4.7)
- `OPENROUTER_API_KEY`
- `GROQ_API_KEY`
- `TRAVELPAYOUTS_TOKEN` (Flights)
- `GOOGLE_PLACES_API_KEY` (Reviews/Photos)
- `OPENWEATHER_API_KEY`

## Notes

- **Styling**: Global CSS uses `@theme inline` from Tailwind v4.
- **Deployment**: `output: 'standalone'` in `next.config.mjs` for Docker/Coolify.
- **Language**: Optimization for Russian language prompt engineering.
