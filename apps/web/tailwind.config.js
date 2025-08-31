const { designTokens } = require('@healthcoachai/design-system');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: designTokens.colors.primary,
        secondary: designTokens.colors.secondary,
        success: designTokens.colors.success,
        warning: designTokens.colors.warning,
        error: designTokens.colors.error,
        neutral: designTokens.colors.neutral,
        background: designTokens.colors.background,
        text: designTokens.colors.text,
        border: designTokens.colors.border,
      },
      fontFamily: {
        sans: designTokens.typography.fontFamily.primary,
        secondary: designTokens.typography.fontFamily.secondary,
        mono: designTokens.typography.fontFamily.mono,
      },
      fontSize: designTokens.typography.fontSize,
      fontWeight: designTokens.typography.fontWeight,
      lineHeight: designTokens.typography.lineHeight,
      letterSpacing: designTokens.typography.letterSpacing,
      spacing: designTokens.spacing,
      borderRadius: designTokens.borderRadius,
      boxShadow: designTokens.shadows,
      screens: designTokens.breakpoints,
      zIndex: designTokens.zIndex,
      transitionDuration: designTokens.motion.duration,
      transitionTimingFunction: designTokens.motion.easing,
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
};