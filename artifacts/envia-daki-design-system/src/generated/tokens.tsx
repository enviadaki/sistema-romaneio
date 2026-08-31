/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#fafafa",
      "foreground": "#1a1a1a",
      "border": "#e6e6e6",
      "card": "#ffffff",
      "cardForeground": "#1a1a1a",
      "popover": "#ffffff",
      "popoverForeground": "#1a1a1a",
      "primary": "#35a6de",
      "primaryForeground": "#0a1720",
      "secondary": "#f0f0f0",
      "secondaryForeground": "#1a1a1a",
      "muted": "#f0f0f0",
      "mutedForeground": "#666666",
      "accent": "#35a6de",
      "accentForeground": "#0a1720",
      "destructive": "#ef4444",
      "destructiveForeground": "#ffffff",
      "input": "#e6e6e6",
      "ring": "#35a6de",
      "chart1": "#35a6de",
      "chart2": "#0ea5a4",
      "chart3": "#f59e0b",
      "chart4": "#7c3aed",
      "chart5": "#ef4444",
      "sidebar": "#121212",
      "sidebarForeground": "#fafafa",
      "sidebarBorder": "#262626",
      "sidebarPrimary": "#35a6de",
      "sidebarPrimaryForeground": "#0a1720",
      "sidebarAccent": "#262626",
      "sidebarAccentForeground": "#fafafa",
      "sidebarRing": "#35a6de"
    },
    "dark": {
      "background": "#121212",
      "foreground": "#fafafa",
      "border": "#262626",
      "card": "#1a1a1a",
      "cardForeground": "#fafafa",
      "popover": "#1a1a1a",
      "popoverForeground": "#fafafa",
      "primary": "#35a6de",
      "primaryForeground": "#0a1720",
      "secondary": "#262626",
      "secondaryForeground": "#fafafa",
      "muted": "#262626",
      "mutedForeground": "#a6a6a6",
      "accent": "#35a6de",
      "accentForeground": "#0a1720",
      "destructive": "#7f1d1d",
      "destructiveForeground": "#ffffff",
      "input": "#262626",
      "ring": "#35a6de",
      "chart1": "#35a6de",
      "chart2": "#2dd4bf",
      "chart3": "#fbbf24",
      "chart4": "#a78bfa",
      "chart5": "#fb7185",
      "sidebar": "#121212",
      "sidebarForeground": "#fafafa",
      "sidebarBorder": "#262626",
      "sidebarPrimary": "#35a6de",
      "sidebarPrimaryForeground": "#0a1720",
      "sidebarAccent": "#262626",
      "sidebarAccentForeground": "#fafafa",
      "sidebarRing": "#35a6de"
    }
  },
  "fontFamily": {
    "sans": [
      "Inter",
      "sans-serif"
    ],
    "serif": [
      "Georgia",
      "serif"
    ],
    "mono": [
      "Menlo",
      "monospace"
    ]
  },
  "radius": "0.5rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
