/**
 * Helper para reintentar queries de Supabase automáticamente
 * cuando detectamos errores de JWT temporal (PGRST303: "JWT issued at future")
 *
 * Este error ocurre cuando hay drift de reloj o el JWT se genera justo
 * antes de que el servidor lo valide. Es transparente para el usuario.
 */

import { supabase } from './supabase';

const JWT_FUTURE_ERROR_CODE = 'PGRST303';
const MAX_RETRIES = 2;

/**
 * Ejecuta una query con retry automático si falla por JWT temporal
 *
 * @param queryFn Función que ejecuta la query de Supabase
 * @returns El resultado de la query o throw si falla después de reintentos
 */
export async function withRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  let lastError: any = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await queryFn();

    // Si no hay error, retornar inmediatamente
    if (!result.error) {
      return result;
    }

    // Si el error NO es JWT temporal, fallar inmediatamente
    if (result.error.code !== JWT_FUTURE_ERROR_CODE) {
      return result;
    }

    lastError = result.error;

    // Si es el primer intento, refrescar sesión y reintentar
    if (attempt === 0) {
      console.log('[Supabase] Detected JWT future error, refreshing session...');

      const { error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.error('[Supabase] Failed to refresh session:', refreshError);
        // Si el refresh falla, no tiene sentido reintentar
        return { data: null, error: refreshError };
      }

      // Pequeño delay para asegurar que el nuevo token está propagado
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Si llegamos aquí, todos los reintentos fallaron
  return { data: null, error: lastError };
}
