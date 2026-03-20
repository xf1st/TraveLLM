# Implementation Plan: Phase 4 - Profile Page & Mobile Navigation Redesign

## Objective
Complete Phase 4 of the TraveLLM mobile UX/UI redesign, focusing on the Profile page, and establish a modern mobile navigation pattern as part of the (main) route group structure.

## Context
Current context shows Phase 4 is "In Progress". The goals are:
-   **Phase 4: Profile Page (Экран 5)**
    -   Editable fields, Avatar UI improvements.
    -   Integration of settings directly into the content.
    -   Mobile-native feel (gestures, bottom sheets).
-   **Global Structure**
    -   Consolidate main routes into `app/(main)` to share a common layout.
    -   Implement a `MobileBottomNav` for better mobile UX.

## Proposed Changes

### 1. Global Navigation & Structure
-   **Create `components/MobileBottomNav.tsx`**:
    -   A sticky bottom bar for mobile (`lg:hidden`).
    -   Navigation items: **Plan** (Compass), **Trips** (Map), **Profile** (User).
    -   Modern glassmorphism style (`trip-glass`).
-   **Create `app/(main)/layout.tsx`**:
    -   Wrap `children` in `AppLayout` or a more modern equivalent.
    -   Ensure it includes `Header` (Desktop/Mobile), `AppSidebar` (Desktop), and `MobileBottomNav` (Mobile).
-   **Route Grouping**:
    -   Move `app/profile/` to `app/(main)/profile/`.
    -   Move `app/trips/` to `app/(main)/trips/`.
    -   Move `app/plan/` to `app/(main)/plan/`.
    -   Move `app/results/` to `app/(main)/results/`.

### 2. Phase 4: Profile Page Refactor (`app/profile/page.tsx`)
-   **Avatar UI**:
    -   Modernize the avatar card with a more prominent gradient background.
    -   Add a "Quick Edit" camera icon directly on the avatar (even outside of Edit mode).
-   **Inline Editing**:
    -   Enable direct editing of **Name** and **Bio** by clicking on them (using a small edit icon or just focus state).
-   **Settings Integration**:
    -   Merge the "Settings" tab functionality more directly into the profile or overview view.
    -   Use `Drawer` (from `shadcn/ui` or similar) for complex settings like "Profile Background" or "Travel Documents" on mobile.
-   **UI Consistency**:
    -   Apply `trip-glass` and consistent padding/spacing for mobile.
    -   Use `framer-motion` for smooth transitions between "Overview" and "Settings".

## Implementation Steps

### Step 1: Mobile Navigation Component
1. Create `components/MobileBottomNav.tsx`.
2. Implement icons and active states based on current route.
3. Add glassmorphism effects and haptic-like animations (framer-motion).

### Step 2: Route Grouping & Layout
1. Create `app/(main)` directory.
2. Create `app/(main)/layout.tsx`.
3. Move existing routes into the group.
4. Update `AppLayout` to support the new mobile navigation if needed.

### Step 3: Profile UI Refactor
1. Update `app/profile/page.tsx` with the new design.
2. Implement inline editing for name/bio.
3. Integrate settings into the content area with card-based UI.
4. Ensure full responsiveness for mobile (`max-md:` classes).

## Verification & Testing
-   **Navigation**: Verify that the BottomNav correctly navigates between Plan, Trips, and Profile on mobile devices/emulators.
-   **Profile**:
    -   Test avatar upload on mobile.
    -   Test inline editing saves to Supabase correctly.
    -   Verify that settings toggles (Notifications, Public Profile) work correctly.
-   **Responsive Layout**: Check that the desktop view remains unchanged (no BottomNav, Sidebar visible).
