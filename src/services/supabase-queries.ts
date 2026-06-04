/**
 * Queries directas a Supabase (sin SQLite)
 *
 * Decisión arquitectónica (mayo 2026):
 * Eliminamos SQLite local en favor de queries directas a Supabase.
 *
 * Razón: Para Fase 1 (uso personal, pocos activos), la complejidad de
 * sincronización bidireccional no justifica los beneficios de offline-first.
 * SQLite causaba race conditions entre pull y read que agregaban más
 * problemas que soluciones.
 *
 * Estrategia actual:
 * - Todas las escrituras van directamente a Supabase
 * - Todas las lecturas vienen directamente de Supabase
 * - Cache en memoria (React state) durante la sesión
 * - Latencia ~50-100ms es aceptable para este caso de uso
 */

import { supabase } from '@/lib/supabase';
import { withRetry } from '@/lib/supabase-retry';
import type { CdtPosition, EtfPosition, AllocationBands } from '@/types/database';
import type { RiskProfile } from '@/constants/risk-profile';
import { PROFILE_BANDS } from '@/constants/risk-profile';

// ─────────────────────────────────────────────────────────────────────────────
// CDT POSITIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllCdts(): Promise<CdtPosition[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await withRetry(async () => {
    const result = await supabase
      .from('cdt_positions')
      .select('*')
      .eq('user_id', user.id)
      .order('end_date', { ascending: true });
    return result;
  });

  if (error) {
    console.error('[Supabase] Error getting CDTs:', error);
    return [];
  }

  return (data || []) as CdtPosition[];
}

export async function getCdtById(id: number): Promise<CdtPosition | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await withRetry(async () => {
    const result = await supabase
      .from('cdt_positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', id)
      .single();
    return result;
  });

  if (error) {
    console.error('[Supabase] Error getting CDT by id:', error);
    return null;
  }

  return data as CdtPosition;
}

export interface CreateCdtInput {
  bank: string;
  amount: number;
  rate: number;
  term_days: number;
  start_date: string;
  end_date: string;
  capitalization?: 'maturity' | 'monthly' | 'quarterly';
  withholding_rate?: number;
  notes?: string;
}

export async function createCdt(input: CreateCdtInput): Promise<number | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { data, error } = await supabase
    .from('cdt_positions')
    .insert({
      user_id: user.id,
      bank: input.bank,
      amount: input.amount,
      rate: input.rate,
      term_days: input.term_days,
      start_date: input.start_date,
      end_date: input.end_date,
      capitalization: input.capitalization ?? 'maturity',
      withholding_rate: input.withholding_rate ?? 0.04,
      notes: input.notes ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Supabase] Error creating CDT:', error);
    throw error;
  }

  return data?.id ?? null;
}

export async function deleteCdt(id: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { error } = await supabase
    .from('cdt_positions')
    .delete()
    .eq('user_id', user.id)
    .eq('id', id);

  if (error) {
    console.error('[Supabase] Error deleting CDT:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ETF POSITIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllEtfs(): Promise<EtfPosition[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await withRetry(async () => {
    const result = await supabase
      .from('etf_positions')
      .select('*')
      .eq('user_id', user.id)
      .order('ticker', { ascending: true });
    return result;
  });

  if (error) {
    console.error('[Supabase] Error getting ETFs:', error);
    return [];
  }

  return (data || []) as EtfPosition[];
}

export async function getEtfById(id: number): Promise<EtfPosition | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await withRetry(async () => {
    const result = await supabase
      .from('etf_positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', id)
      .single();
    return result;
  });

  if (error) {
    console.error('[Supabase] Error getting ETF by id:', error);
    return null;
  }

  return data as EtfPosition;
}

export async function getEtfByTicker(ticker: string): Promise<EtfPosition | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await withRetry(async () => {
    const result = await supabase
      .from('etf_positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('ticker', ticker.toUpperCase())
      .single();
    return result;
  });

  if (error) {
    // Not found es esperado, no logueamos
    return null;
  }

  return data as EtfPosition;
}

export interface CreateEtfInput {
  ticker: string;
  name: string;
  shares: number;
  average_cost_usd: number;
  ter: number;
  currency?: string;
  total_invested_cop?: number | null;
  trm_at_purchase?: number | null;
  total_invested_usd?: number | null;
}

export async function createEtf(input: CreateEtfInput): Promise<number | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { data, error } = await supabase
    .from('etf_positions')
    .insert({
      user_id: user.id,
      ticker: input.ticker.toUpperCase(),
      name: input.name,
      shares: input.shares,
      average_cost_usd: input.average_cost_usd,
      ter: input.ter,
      currency: input.currency ?? 'USD',
      total_invested_cop: input.total_invested_cop ?? null,
      trm_at_purchase: input.trm_at_purchase ?? null,
      total_invested_usd: input.total_invested_usd ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Supabase] Error creating ETF:', error);
    throw error;
  }

  return data?.id ?? null;
}

export async function deleteEtf(id: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { error } = await supabase
    .from('etf_positions')
    .delete()
    .eq('user_id', user.id)
    .eq('id', id);

  if (error) {
    console.error('[Supabase] Error deleting ETF:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USER CONFIG (perfil de riesgo, bandas de asignación)
// ─────────────────────────────────────────────────────────────────────────────

async function getConfig(key: string): Promise<any | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await withRetry(async () => {
    const result = await supabase
      .from('user_config')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', key)
      .single();
    return result;
  });

  if (error) {
    // Not found es esperado cuando no hay config
    return null;
  }

  return data?.value ?? null;
}

async function setConfig(key: string, value: unknown): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { error } = await supabase
    .from('user_config')
    .upsert({
      user_id: user.id,
      key,
      value,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,key'
    });

  if (error) {
    console.error('[Supabase] Error setting config:', error);
    throw error;
  }
}

export async function getRiskProfile(): Promise<RiskProfile | null> {
  const value = await getConfig('risk_profile');
  console.log('[Supabase] getRiskProfile returned:', value ? 'found' : 'null');
  return value as RiskProfile | null;
}

export async function setRiskProfile(profile: RiskProfile): Promise<void> {
  await setConfig('risk_profile', profile);
  await setConfig('allocation_bands', PROFILE_BANDS[profile.label]);
}

export async function getAllocationBands(): Promise<AllocationBands | null> {
  const value = await getConfig('allocation_bands');
  return value as AllocationBands | null;
}

export async function resetRiskProfile(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { error } = await supabase
    .from('user_config')
    .delete()
    .eq('user_id', user.id)
    .in('key', ['risk_profile', 'allocation_bands']);

  if (error) {
    console.error('[Supabase] Error resetting risk profile:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MACRO CONTEXT (TRM, tasas Banrep, inflación)
// ─────────────────────────────────────────────────────────────────────────────

export interface MacroContext {
  trm: number
  policyRate: number
  inflationCOP: number | null
  inflationUSD: number | null
  date: string
}

/**
 * Obtiene el contexto macroeconómico más reciente
 */
export async function getMacroContext(): Promise<MacroContext> {
  return withRetry(async () => {
    // 1. TRM más reciente
    const { data: trmData, error: trmError } = await supabase
      .from('macro_rates')
      .select('value, effective_date')
      .eq('type', 'trm')
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (trmError) throw trmError;

    // 2. Tasa de política (manual, puede no existir)
    const { data: policyData } = await supabase
      .from('macro_rates')
      .select('value')
      .eq('type', 'banrep_policy_rate')
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Inflación COP (opcional)
    const { data: inflationCOPData } = await supabase
      .from('macro_rates')
      .select('value')
      .eq('type', 'inflation_cop_annual')
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Inflación USD (opcional)
    const { data: inflationUSDData } = await supabase
      .from('macro_rates')
      .select('value')
      .eq('type', 'inflation_usd_annual')
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      trm: trmData.value,
      policyRate: policyData?.value ?? 11.25, // fallback a valor conocido
      inflationCOP: inflationCOPData?.value ?? null,
      inflationUSD: inflationUSDData?.value ?? null,
      date: trmData.effective_date,
    };
  });
}

/**
 * Obtiene TRM de una fecha específica
 * Si la fecha es fin de semana/festivo, retorna el último día hábil anterior
 */
export async function getTrmOnDate(date: string): Promise<number> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('macro_rates')
      .select('value')
      .eq('type', 'trm')
      .lte('effective_date', date)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data.value;
  });
}

/**
 * Obtiene histórico de TRM para calcular devaluación
 * @param years - Años de histórico a obtener (default: 5)
 * @returns Array de {date, trm} ordenado cronológicamente (más antiguo primero)
 */
export async function getTrmHistory(years: number = 5): Promise<Array<{ date: string; trm: number }>> {
  return withRetry(async () => {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);
    const fromDate = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('macro_rates')
      .select('effective_date, value')
      .eq('type', 'trm')
      .gte('effective_date', fromDate)
      .order('effective_date', { ascending: true });

    if (error) throw error;

    return data.map(row => ({
      date: row.effective_date,
      trm: row.value,
    }));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CDT RATES (tasas promedio de mercado)
// ─────────────────────────────────────────────────────────────────────────────

export interface CdtMarketRate {
  termDays: number
  rate: number
  effectiveDate: string
}

/**
 * Obtiene las tasas CDT de mercado más recientes
 * @param termDays - Plazo específico (30, 60, 90, 120, 180, 360) o undefined para todos
 * @returns Array de tasas por plazo
 */
export async function getCdtMarketRates(termDays?: number): Promise<CdtMarketRate[]> {
  return withRetry(async () => {
    let query = supabase
      .from('cdt_rates')
      .select('term_days, rate, effective_date')
      .is('bank', null)  // solo promedios de mercado
      .order('effective_date', { ascending: false });

    if (termDays) {
      // Tasa más reciente para un plazo específico
      query = query.eq('term_days', termDays).limit(1);
    } else {
      // Última tasa de cada plazo (agrupa por term_days)
      // Limitamos a 10 por si hay múltiples fechas recientes
      query = query.limit(10);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Si no especificaron plazo, deduplicar por term_days (mantener más reciente)
    if (!termDays && data) {
      const seen = new Set<number>();
      const filtered = data.filter(row => {
        if (seen.has(row.term_days)) return false;
        seen.add(row.term_days);
        return true;
      });
      return filtered.map(row => ({
        termDays: row.term_days,
        rate: row.rate,
        effectiveDate: row.effective_date,
      }));
    }

    return (data || []).map(row => ({
      termDays: row.term_days,
      rate: row.rate,
      effectiveDate: row.effective_date,
    }));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EOD PRICES (ETF Market Data)
// ─────────────────────────────────────────────────────────────────────────────

export interface EodPrice {
  ticker: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number;
  volume: number;
  currency: string;
}

/**
 * Obtiene el precio más reciente de un ETF
 */
export async function getLatestEodPrice(ticker: string): Promise<EodPrice | null> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('eod_prices')
      .select('*')
      .eq('ticker', ticker)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ticker: data.ticker,
      date: data.date,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      adjustedClose: data.adjusted_close,
      volume: data.volume,
      currency: data.currency,
    };
  });
}

/**
 * Obtiene precios de un ETF en un rango de fechas
 */
export async function getEodPriceRange(
  ticker: string,
  fromDate: string,
  toDate: string
): Promise<EodPrice[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('eod_prices')
      .select('*')
      .eq('ticker', ticker)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      ticker: row.ticker,
      date: row.date,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      adjustedClose: row.adjusted_close,
      volume: row.volume,
      currency: row.currency,
    }));
  });
}

/**
 * Obtiene precio de un ETF en una fecha específica
 * Si la fecha es fin de semana/festivo, retorna el último día hábil anterior
 */
export async function getEodPriceOnDate(ticker: string, date: string): Promise<EodPrice | null> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('eod_prices')
      .select('*')
      .eq('ticker', ticker)
      .lte('date', date)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ticker: data.ticker,
      date: data.date,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      adjustedClose: data.adjusted_close,
      volume: data.volume,
      currency: data.currency,
    };
  });
}

/**
 * Obtiene precios más recientes de múltiples tickers
 */
export async function getLatestEodPrices(tickers: string[]): Promise<Map<string, EodPrice>> {
  const pricesMap = new Map<string, EodPrice>();

  await Promise.all(
    tickers.map(async (ticker) => {
      const price = await getLatestEodPrice(ticker);
      if (price) {
        pricesMap.set(ticker, price);
      }
    })
  );

  return pricesMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// INBOX EVENTS (eventos del Buzón generados por motor backend)
// ─────────────────────────────────────────────────────────────────────────────

export interface InboxEvent {
  id: number
  userId: string
  type: string
  subtype?: string
  title: string
  body: string
  assetRef?: string
  assetType?: string
  readAt?: string
  dismissedAt?: string
  metadata: Record<string, any>
  createdAt: string
}

/**
 * Obtiene todos los eventos del Buzón del usuario (no eliminados)
 * Ordenados por: no leídos primero, luego por fecha descendente
 */
export async function getInboxEvents(): Promise<InboxEvent[]> {
  return withRetry(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No authenticated user')

    const { data, error } = await supabase
      .from('inbox_events')
      .select('*')
      .eq('user_id', user.id)
      .is('dismissed_at', null)  // solo eventos no eliminados
      .order('read_at', { ascending: true, nullsFirst: true })  // no leídos primero
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      subtype: row.subtype,
      title: row.title,
      body: row.body,
      assetRef: row.asset_ref,
      assetType: row.asset_type,
      readAt: row.read_at,
      dismissedAt: row.dismissed_at,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    }))
  })
}

/**
 * Marca un evento como leído
 */
export async function markEventAsRead(eventId: number): Promise<void> {
  return withRetry(async () => {
    const { error } = await supabase
      .from('inbox_events')
      .update({ read_at: new Date().toISOString() })
      .eq('id', eventId)

    if (error) throw error
  })
}

/**
 * Marca un evento como no leído
 */
export async function markEventAsUnread(eventId: number): Promise<void> {
  return withRetry(async () => {
    const { error } = await supabase
      .from('inbox_events')
      .update({ read_at: null })
      .eq('id', eventId)

    if (error) throw error
  })
}

/**
 * Elimina (soft delete) un evento del Buzón
 */
export async function dismissEvent(eventId: number): Promise<void> {
  return withRetry(async () => {
    const { error } = await supabase
      .from('inbox_events')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', eventId)

    if (error) throw error
  })
}
