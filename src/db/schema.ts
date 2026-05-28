// TypeScript types mirroring the SQLite schema
// Financial amounts stored as REAL (float64) — precision sufficient for Phase 1 personal use

export type AssetType = 'cdt' | 'etf';

export type CdtCapitalization = 'maturity' | 'monthly' | 'quarterly';

export type InboxEventType =
  | 'market_trigger'
  | 'drawdown_context'
  | 'cdt_maturity'
  | 'rebalance'
  | 'educational';

export type InboxEventSubtype =
  | 'cdt_favorable'
  | 'etf_crosses_baseline'
  | 'drawdown_structural'
  | 'sortino_improved'
  | 'macro_change'
  | 'time_in_market'
  | 'review_bands';

export type MacroRateType =
  | 'banrep_policy_rate'
  | 'trm'
  | 'inflation_colombia'
  | 'inflation_usa';

export type RateSource = 'banrep_api' | 'manual';

// --- Positions ---

export interface CdtPosition {
  id: number;
  bank: string;
  amount: number;            // COP
  rate: number;              // annual rate as decimal (0.12 = 12%)
  term_days: number;
  start_date: string;        // ISO date YYYY-MM-DD
  end_date: string;          // ISO date YYYY-MM-DD
  capitalization: CdtCapitalization;
  withholding_rate: number;  // retefuente, default 0.04
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EtfPosition {
  id: number;
  ticker: string;
  name: string;
  shares: number;
  average_cost_usd: number;  // average purchase price in USD
  ter: number;               // total expense ratio as decimal (0.0003 = 0.03%)
  currency: string;          // default 'USD'
  created_at: string;
  updated_at: string;
}

// --- Market Data ---

export interface EodPrice {
  id: number;
  ticker: string;
  date: string;              // ISO date YYYY-MM-DD
  close_price: number;
  currency: string;
}

export interface CdtRate {
  id: number;
  bank: string;              // 'bancolombia' | 'bogota' | 'davivienda' | 'promedio_banrep'
  term_days: number;         // 30, 60, 90, 180, 360
  rate: number;              // annual rate as decimal
  effective_date: string;    // ISO date YYYY-MM-DD
  source: RateSource;
  created_at: string;
}

export interface MacroRate {
  id: number;
  type: MacroRateType;
  value: number;
  effective_date: string;    // ISO date YYYY-MM-DD
  source: RateSource;
  created_at: string;
}

// --- Inbox ---

export interface InboxEvent {
  id: number;
  type: InboxEventType;
  subtype: InboxEventSubtype | null;
  title: string;
  body: string;
  asset_ref: string | null;   // ticker or bank identifier
  asset_type: AssetType | null;
  read_at: string | null;     // null = unread
  dismissed_at: string | null;
  metadata: string | null;    // JSON string
  created_at: string;
}

// --- Config ---

export interface UserConfig {
  key: string;
  value: string;             // JSON string
  updated_at: string;
}

// Typed config values
export interface AllocationBands {
  cdt_min: number;           // 0.5 = 50%
  cdt_max: number;           // 0.7 = 70%
  etf_min: number;           // 0.3 = 30%
  etf_max: number;           // 0.5 = 50%
}

export const DEFAULT_ALLOCATION_BANDS: AllocationBands = {
  cdt_min: 0.5,
  cdt_max: 0.7,
  etf_min: 0.3,
  etf_max: 0.5,
};
