import '@/global.css';
import { Platform } from 'react-native';

// Design tokens — Magic Invest
// Color is a cognitive tool, not decoration.
// Present data → neutral (no emotional charge)
// Structural data & projections → expressive but deliberately non-market colors

export const Tokens = {
  neutral: {
    background: '#FAFAF7',
    text: '#1F2024',
    muted: '#9CA3AF',
  },
  structural: {
    positive: '#5B8E8E',
    attention: '#C08552',
    risk: '#6B4E71',
  },
  projection: {
    optimistic: '#5B8E8E',
    median: '#4B4F58',
    pessimistic: '#6B4E71',
  },
} as const;

// ── Sistema de color de dos idiomas ──────────────────────────────────────────
//
// Idioma 1 — Identidad del tipo de activo (assetCdt, assetEtf, …)
//   El usuario aprende a asociar cada color con un producto específico.
//   Se usa en íconos, badges, chips y el formulario de registro.
//
// Idioma 2 — Comunicación de severidad (positive, attention, risk)
//   Cajas informativas, proyecciones, indicadores de estado del portafolio.
//   Completamente independiente del tipo de activo.
//
// ─────────────────────────────────────────────────────────────────────────────

export const Colors = {
  light: {
    // ── Superficies y texto
    text:               '#1F2024',
    background:         '#FAFAF7',
    backgroundElement:  '#F0F0EC',
    backgroundSelected: '#E8E8E4',
    textSecondary:      '#9CA3AF',
    textPlaceholder:    '#B8BDC5',  // Más tenue que textSecondary para placeholders
    divider:            '#E0E0DC',

    // ── Semánticos — comunicación de severidad
    positive:       '#5B8E8E',
    attention:      '#C08552',
    risk:           '#6B4E71',

    // ── Semánticos subtle (fondos de cajas informativas)
    positiveSubtle:  'rgba(91,142,142,0.10)',
    attentionSubtle: 'rgba(192,133,82,0.10)',
    riskSubtle:      'rgba(107,78,113,0.10)',

    // ── Semánticos borders
    positiveBorder:  'rgba(91,142,142,0.28)',
    attentionBorder: 'rgba(192,133,82,0.28)',
    riskBorder:      'rgba(107,78,113,0.28)',

    // ── Gráficas (sección secundaria/alpha)
    positiveChart: 'rgba(91,142,142,0.40)',

    // ── Identidad de activos
    assetCdt:    '#3A6B9A',
    assetEtf:    '#3A7850',
    assetStock:  '#637028',
    assetFund:   '#5048A0',
    assetCrypto: '#A04870',
  },
  dark: {
    // ── Superficies y texto
    text:               '#E8E8E4',
    background:         '#1A1A18',
    backgroundElement:  '#252522',
    backgroundSelected: '#2E2E2A',
    textSecondary:      '#6B7280',
    textPlaceholder:    '#555861',  // Más tenue que textSecondary para placeholders
    divider:            '#353532',

    // ── Semánticos — comunicación de severidad (versiones +20-40% luminosidad)
    positive:       '#7AB0B0',
    attention:      '#D4A070',
    risk:           '#9A78A0',

    // ── Semánticos subtle
    positiveSubtle:  'rgba(122,176,176,0.12)',
    attentionSubtle: 'rgba(212,160,112,0.12)',
    riskSubtle:      'rgba(154,120,160,0.12)',

    // ── Semánticos borders
    positiveBorder:  'rgba(122,176,176,0.30)',
    attentionBorder: 'rgba(212,160,112,0.30)',
    riskBorder:      'rgba(154,120,160,0.30)',

    // ── Gráficas
    positiveChart: 'rgba(122,176,176,0.35)',

    // ── Identidad de activos (versiones +20% luminosidad para fondos oscuros)
    assetCdt:    '#5A8BBF',
    assetEtf:    '#5A9870',
    assetStock:  '#8A9A45',
    assetFund:   '#7068C0',
    assetCrypto: '#C068A0',
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
