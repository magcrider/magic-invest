/**
 * Queries de User Profiles
 */

import { supabase } from '@/lib/supabase';
import { withRetry } from '@/lib/supabase-retry';
import type { UserProfile, DocumentType } from '@/types/database';

/**
 * Obtiene el perfil del usuario actual
 * Si no existe, lo crea automáticamente con los datos de auth
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  return withRetry(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    let { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    // Si no existe perfil, crearlo automáticamente
    if (!data) {
      const fullName = user.user_metadata?.full_name || user.email || 'Usuario';

      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          full_name: fullName,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return newProfile;
    }

    return data;
  });
}

/**
 * Crea o actualiza el perfil del usuario
 */
export async function upsertUserProfile(profile: {
  full_name: string;
  document_type?: DocumentType | null;
  document_number?: string | null;
  city?: string | null;
}): Promise<void> {
  return withRetry(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        full_name: profile.full_name,
        document_type: profile.document_type || null,
        document_number: profile.document_number || null,
        city: profile.city || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) throw error;
  });
}

/**
 * Verifica si el usuario completó su perfil (tiene tipo y número de documento)
 */
export async function isProfileComplete(): Promise<boolean> {
  const profile = await getUserProfile();
  if (!profile) return false;

  return !!(
    profile.document_type &&
    profile.document_number &&
    profile.document_number.trim().length > 0
  );
}
