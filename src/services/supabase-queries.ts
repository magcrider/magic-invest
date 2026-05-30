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
import type { CdtPosition, EtfPosition, AllocationBands } from '@/types/database';
import type { RiskProfile } from '@/constants/risk-profile';
import { PROFILE_BANDS } from '@/constants/risk-profile';

// ─────────────────────────────────────────────────────────────────────────────
// CDT POSITIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllCdts(): Promise<CdtPosition[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('cdt_positions')
    .select('*')
    .eq('user_id', user.id)
    .order('end_date', { ascending: true });

  if (error) {
    console.error('[Supabase] Error getting CDTs:', error);
    return [];
  }

  return (data || []) as CdtPosition[];
}

export async function getCdtById(id: number): Promise<CdtPosition | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('cdt_positions')
    .select('*')
    .eq('user_id', user.id)
    .eq('id', id)
    .single();

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

  const { data, error } = await supabase
    .from('etf_positions')
    .select('*')
    .eq('user_id', user.id)
    .order('ticker', { ascending: true });

  if (error) {
    console.error('[Supabase] Error getting ETFs:', error);
    return [];
  }

  return (data || []) as EtfPosition[];
}

export async function getEtfById(id: number): Promise<EtfPosition | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('etf_positions')
    .select('*')
    .eq('user_id', user.id)
    .eq('id', id)
    .single();

  if (error) {
    console.error('[Supabase] Error getting ETF by id:', error);
    return null;
  }

  return data as EtfPosition;
}

export async function getEtfByTicker(ticker: string): Promise<EtfPosition | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('etf_positions')
    .select('*')
    .eq('user_id', user.id)
    .eq('ticker', ticker.toUpperCase())
    .single();

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

  const { data, error } = await supabase
    .from('user_config')
    .select('value')
    .eq('user_id', user.id)
    .eq('key', key)
    .single();

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
  return await getConfig('allocation_bands');
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
