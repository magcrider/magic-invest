import '@/global.css';
import { Platform } from 'react-native';

// Design tokens — Magic Invest
// Color is a cognitive tool, not decoration.
// Present data → neutral (no emotional charge)
// Structural data & projections → expressive but deliberately non-market colors

export const Tokens = {
  neutral: {
    background: '#FAFAF7', // warm cream — reduces visual fatigue vs pure white
    text: '#1F2024',       // charcoal — primary text
    muted: '#9CA3AF',      // stone gray — present data (balances, EOD %, tables)
  },
  structural: {
    positive: '#5B8E8E',   // muted teal — strong Sortino, sustained CAGR (not "green gain")
    attention: '#C08552',  // burnt amber — frontier metrics, suggested rebalance (not alarm)
    risk: '#6B4E71',       // dark purple — high MaxDD, structural risk (not "red loss")
  },
  projection: {
    optimistic: '#5B8E8E', // P90+ bands — continues structural.positive language
    median: '#4B4F58',     // P50 reference — neutral carbon, no bias
    pessimistic: '#6B4E71',// P10- bands — continues structural.risk language
  },
} as const;

// Light/dark compatibility layer (used by ThemedText, ThemedView)
export const Colors = {
  light: {
    text: Tokens.neutral.text,
    background: Tokens.neutral.background,
    backgroundElement: '#F0F0EC',
    backgroundSelected: '#E8E8E4',
    textSecondary: Tokens.neutral.muted,
  },
  dark: {
    text: '#E8E8E4',
    background: '#1A1A18',
    backgroundElement: '#252522',
    backgroundSelected: '#2E2E2A',
    textSecondary: '#6B7280',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
