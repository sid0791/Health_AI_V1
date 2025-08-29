/**
 * HealthCoachAI Design System - Core Design Tokens
 *
 * Brand: Fresh greens & turquoise with coral accents
 * Typography: Inter/Poppins
 * Accessibility: WCAG 2.1 AA compliant
 */

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#f0fdfa', // Very light turquoise
    100: '#ccfbf1', // Light turquoise
    200: '#99f6e4', // Lighter turquoise
    300: '#5eead4', // Light turquoise
    400: '#2dd4bf', // Medium turquoise
    500: '#14b8a6', // Primary turquoise (main brand color)
    600: '#0d9488', // Darker turquoise
    700: '#0f766e', // Dark turquoise
    800: '#115e59', // Very dark turquoise
    900: '#134e4a', // Darkest turquoise
  },

  // Secondary Brand Colors (Coral/Orange)
  secondary: {
    50: '#fef7ee', // Very light coral
    100: '#fedfc7', // Light coral
    200: '#fdba8c', // Lighter coral
    300: '#fb923c', // Light coral
    400: '#f97316', // Medium coral
    500: '#f0653e', // Primary coral (accent color)
    600: '#ea580c', // Darker coral
    700: '#c2410c', // Dark coral
    800: '#9a3412', // Very dark coral
    900: '#7c2d12', // Darkest coral
  },

  // Success Colors (Green)
  success: {
    50: '#f0fdf4', // Very light green
    100: '#dcfce7', // Light green
    200: '#bbf7d0', // Lighter green
    300: '#86efac', // Light green
    400: '#4ade80', // Medium green
    500: '#22c55e', // Primary green
    600: '#16a34a', // Darker green
    700: '#15803d', // Dark green
    800: '#166534', // Very dark green
    900: '#14532d', // Darkest green
  },

  // Warning Colors (Yellow)
  warning: {
    50: '#fefce8', // Very light yellow
    100: '#fef3c7', // Light yellow
    200: '#fde68a', // Lighter yellow
    300: '#fcd34d', // Light yellow
    400: '#fbbf24', // Medium yellow
    500: '#f59e0b', // Primary yellow
    600: '#d97706', // Darker yellow
    700: '#b45309', // Dark yellow
    800: '#92400e', // Very dark yellow
    900: '#78350f', // Darkest yellow
  },

  // Error Colors (Red)
  error: {
    50: '#fef2f2', // Very light red
    100: '#fee2e2', // Light red
    200: '#fecaca', // Lighter red
    300: '#fca5a5', // Light red
    400: '#f87171', // Medium red
    500: '#ef4444', // Primary red
    600: '#dc2626', // Darker red
    700: '#b91c1c', // Dark red
    800: '#991b1b', // Very dark red
    900: '#7f1d1d', // Darkest red
  },

  // Neutral Colors
  neutral: {
    0: '#ffffff', // Pure white
    50: '#fafafa', // Very light gray
    100: '#f5f5f5', // Light gray
    200: '#e5e5e5', // Lighter gray
    300: '#d4d4d4', // Light gray
    400: '#a3a3a3', // Medium gray
    500: '#737373', // Gray
    600: '#525252', // Darker gray
    700: '#404040', // Dark gray
    800: '#262626', // Very dark gray
    900: '#171717', // Darkest gray
    1000: '#000000', // Pure black
  },

  // Semantic Colors
  background: {
    primary: '#ffffff', // White background
    secondary: '#fafafa', // Light gray background
    tertiary: '#f5f5f5', // Lighter gray background
    inverse: '#171717', // Dark background
  },

  text: {
    primary: '#171717', // Primary text (dark gray)
    secondary: '#525252', // Secondary text (medium gray)
    tertiary: '#737373', // Tertiary text (light gray)
    inverse: '#ffffff', // Inverse text (white)
    disabled: '#a3a3a3', // Disabled text
  },

  border: {
    primary: '#e5e5e5', // Primary border
    secondary: '#d4d4d4', // Secondary border
    focus: '#14b8a6', // Focus border (primary turquoise)
    error: '#ef4444', // Error border
  },
} as const;

export const typography = {
  fontFamily: {
    primary: ['Inter', 'system-ui', 'sans-serif'],
    secondary: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
    mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'monospace'],
  },

  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
    '6xl': '3.75rem', // 60px
  },

  fontWeight: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

export const spacing = {
  0: '0',
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
  36: '9rem', // 144px
  40: '10rem', // 160px
  44: '11rem', // 176px
  48: '12rem', // 192px
  52: '13rem', // 208px
  56: '14rem', // 224px
  60: '15rem', // 240px
  64: '16rem', // 256px
  72: '18rem', // 288px
  80: '20rem', // 320px
  96: '24rem', // 384px
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.125rem', // 2px
  base: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px', // Complete circle
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

export const breakpoints = {
  sm: '640px', // Mobile landscape
  md: '768px', // Tablet
  lg: '1024px', // Desktop
  xl: '1280px', // Large desktop
  '2xl': '1536px', // Extra large desktop
} as const;

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// Accessibility constants
export const accessibility = {
  minTapTarget: '44px', // Minimum tap target size (WCAG AA)
  focusRingWidth: '2px', // Focus ring width
  focusRingOffset: '2px', // Focus ring offset

  // Color contrast ratios (WCAG AA)
  contrastRatio: {
    normal: 4.5, // Normal text
    large: 3, // Large text (18px+ or 14px+ bold)
    ui: 3, // UI components
  },
} as const;

// Motion and animation
export const motion = {
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
  },

  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Export all tokens as a unified design system
export const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  zIndex,
  accessibility,
  motion,
} as const;

export default designTokens;
