// TraveLM Mobile Design System
// Based on the web app's OKLch color scheme, adapted for React Native

export const Colors = {
  light: {
    background: '#F8F5F0',
    surface: '#FFFFFF',
    surfaceSecondary: '#F0EDE8',
    card: '#FFFFFF',
    cardBorder: '#E8E4DF',
    primary: '#7CB9D4',
    primaryDark: '#5A9BB8',
    primaryLight: '#A8D4E8',
    secondary: '#F0F4F8',
    accent: '#7CB9D4',
    text: '#2D2B3D',
    textSecondary: '#6B6980',
    textMuted: '#9E9CB0',
    border: '#E0DDD8',
    destructive: '#D4553A',
    success: '#4CAF50',
    warning: '#FFA726',
    overlay: 'rgba(0,0,0,0.4)',
    glass: 'rgba(255,255,255,0.7)',
    glassBorder: 'rgba(255,255,255,0.3)',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E8E4DF',
    inputBackground: '#F5F3EE',
    inputBorder: '#E0DDD8',
    skeleton: '#E8E4DF',
  },
  dark: {
    background: '#0A0A1A',
    surface: '#141428',
    surfaceSecondary: '#1A1A30',
    card: '#141428',
    cardBorder: '#252540',
    primary: '#FAFAFA',
    primaryDark: '#E0E0E0',
    primaryLight: '#FFFFFF',
    secondary: '#1A1A30',
    accent: '#7CB9D4',
    text: '#F0F0F0',
    textSecondary: '#A0A0B8',
    textMuted: '#6B6B80',
    border: '#252540',
    destructive: '#EF5350',
    success: '#66BB6A',
    warning: '#FFA726',
    overlay: 'rgba(0,0,0,0.6)',
    glass: 'rgba(255,255,255,0.03)',
    glassBorder: 'rgba(255,255,255,0.06)',
    tabBar: '#0E0E20',
    tabBarBorder: '#1A1A30',
    inputBackground: '#1A1A30',
    inputBorder: '#252540',
    skeleton: '#1A1A30',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
};

// Gradient presets
export const Gradients = {
  primary: ['#7CB9D4', '#5A9BB8'] as const,
  dark: ['#0A0A1A', '#141428'] as const,
  card: ['#141428', '#1A1A30'] as const,
  accent: ['#7CB9D4', '#A8D4E8'] as const,
  sunset: ['#FF6B6B', '#FFA726'] as const,
  ocean: ['#4FC3F7', '#7CB9D4'] as const,
  aurora: ['#7C4DFF', '#448AFF', '#18FFFF'] as const,
};

// Animation presets
export const Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  spring: {
    damping: 15,
    stiffness: 150,
  },
};
