/**
 * Design Tokens - TraveLM UI
 *
 * Centralized design values for consistent UI across the app.
 * Based on Atomize Design System principles.
 */

// ===========================================
// SPACING & SIZING
// ===========================================

export const spacing = {
  // Touch targets (WCAG minimum 44px)
  touchTarget: '44px',
  touchTargetMin: '2.75rem', // 44px

  // Component heights
  buttonSm: '2.75rem',   // 44px - was 36px, now meets touch target
  buttonMd: '3rem',      // 48px
  buttonLg: '3.25rem',   // 52px
  buttonXl: '3.5rem',    // 56px

  inputHeight: '2.875rem', // 46px

  // Icon buttons
  iconButtonSm: '2.75rem', // 44px
  iconButtonMd: '3rem',    // 48px
  iconButtonLg: '3.25rem', // 52px
} as const

// ===========================================
// BORDER RADIUS
// ===========================================

export const radius = {
  // Standardized radius scale (matching CSS variables)
  none: '0',
  sm: '0.5rem',      // 8px - small elements, badges
  md: '0.75rem',     // 12px - buttons, inputs
  lg: '1rem',        // 16px - cards, dialogs
  xl: '1.25rem',     // 20px - large cards
  '2xl': '1.5rem',   // 24px - hero sections
  '3xl': '2rem',     // 32px - decorative
  full: '9999px',    // Pills, avatars
} as const

// Component-specific radius (for consistency)
export const componentRadius = {
  button: radius.md,
  buttonSm: radius.sm,
  buttonLg: radius.lg,

  input: radius.md,

  card: radius.lg,
  cardLg: radius.xl,

  dialog: radius.lg,

  badge: radius.sm,

  avatar: radius.full,

  tooltip: radius.sm,

  dropdown: radius.md,
} as const

// ===========================================
// TYPOGRAPHY
// ===========================================

export const typography = {
  // Letter spacing - responsive
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',

    // Desktop headings
    headingDesktop: '-0.025em',
    // Mobile headings (less tight for readability)
    headingMobile: '-0.01em',

    // Body text
    bodyDesktop: '-0.01em',
    bodyMobile: '0',
  },

  // Line heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
} as const

// ===========================================
// Z-INDEX SCALE
// ===========================================

export const zIndex = {
  // Background elements
  background: 0,
  backgroundEffects: 1,

  // Content layers
  base: 10,
  floatingImages: 15,  // Decorative floating elements
  content: 20,
  elevated: 25,

  // Interactive overlays
  searchBar: 30,
  dropdown: 40,
  sidebar: 40,

  // Modal layers
  overlay: 50,
  modal: 50,
  dialog: 50,
  drawer: 50,
  toast: 60,
  tooltip: 70,

  // Maximum priority
  maximum: 9999,
} as const

// ===========================================
// COLORS (Contrast-safe)
// ===========================================

export const colors = {
  // Muted foreground - improved contrast (4.5:1 ratio)
  mutedForeground: {
    light: 'oklch(0.45 0.02 225)',  // Darker for better contrast
    dark: 'oklch(0.70 0 0)',        // Lighter for dark mode
  },

  // Focus ring
  focusRing: {
    width: '3px',
    offset: '2px',
    color: 'ring',
    opacity: '50%',
  },
} as const

// ===========================================
// TRANSITIONS
// ===========================================

export const transitions = {
  // Durations
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Easings
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
} as const

// ===========================================
// FOCUS STATES (Accessibility)
// ===========================================

export const focusStyles = {
  // Standard focus-visible ring
  ring: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',

  // Thicker ring for larger elements
  ringThick: 'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',

  // For dark backgrounds
  ringLight: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2',

  // For destructive elements
  ringDestructive: 'focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
} as const

// ===========================================
// SHADOWS
// ===========================================

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',

  // Glow effects
  glowSm: '0 0 20px -5px var(--primary)',
  glow: '0 0 40px -10px var(--primary)',
} as const

// ===========================================
// BREAKPOINTS
// ===========================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// ===========================================
// TAILWIND CLASS HELPERS
// ===========================================

// Common component classes for consistency
export const componentClasses = {
  // Card with proper focus state
  card: 'rounded-lg border border-border/50 bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2',

  // Interactive card (clickable)
  cardInteractive: 'rounded-lg border border-border/50 bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 cursor-pointer',

  // Link with focus state
  linkFocus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 rounded-sm',

  // Badge with proper radius
  badge: 'rounded-md px-2.5 py-0.5 text-xs font-medium',
} as const
