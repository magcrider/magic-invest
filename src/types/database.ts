// Types for database entities
// (Previously in src/db/schema.ts, now moved here after SQLite removal)

export type CdtCapitalization = 'maturity' | 'monthly' | 'quarterly';

export type RiskProfileLabel = 'conservador' | 'moderado' | 'arriesgado';

export type DocumentType = 'cc' | 'ce' | 'nit' | 'passport';

export interface UserProfile {
  user_id: string;
  full_name: string;
  document_type: DocumentType | null;
  document_number: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiskProfile {
  label: RiskProfileLabel;
  horizon_id: number;
  reaction_id: number;
  goal_id: number;
  experience_id: number;
  emotion_id: number;
  cdt_min: number;
  cdt_max: number;
  etf_min: number;
  etf_max: number;
  created_at?: string;
}

export interface Cdt {
  id: string;
  user_id: string;
  bank: string;
  amount: number;
  rate: number;
  term_days: number;
  start_date: string;
  end_date: string;
  capitalization: CdtCapitalization;
  withholding_rate: number;
  created_at: string;
}

export interface Etf {
  id: string;
  user_id: string;
  ticker: string;
  name: string;
  shares: number;
  average_cost_usd: number;
  ter: number;
  currency: 'COP' | 'USD';
  total_invested_cop: number | null;
  trm_at_purchase: number | null;
  total_invested_usd: number | null;
  created_at: string;
}

export interface EodPrice {
  id: string;
  ticker: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
  currency: string;
  source: string;
  created_at: string;
}

export interface AllocationBands {
  cdt_min: number;
  cdt_max: number;
  etf_min: number;
  etf_max: number;
}

// Extended types with computed fields (used in UI)
export interface CdtPosition extends Cdt {
  // Computed fields can be added here if needed
}

export interface EtfPosition extends Etf {
  // Computed fields can be added here if needed
}
