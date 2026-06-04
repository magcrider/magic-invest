/**
 * Wrapper para queries con timeout customizado
 *
 * Problema: fetch() en React Native puede tardar hasta 60s antes de fallar.
 * Solución: Promise.race() entre la query y un timeout de 8 segundos.
 *
 * Mejora UX: Usuario recibe feedback de error en 8s en lugar de 60s.
 */

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Ejecuta una promesa con timeout máximo
 *
 * @param promise - Promesa a ejecutar (ej: fetch, supabase query)
 * @param timeoutMs - Timeout en milisegundos (default: 8000ms)
 * @returns Resultado de la promesa si completa antes del timeout
 * @throws TimeoutError si excede el timeout
 *
 * @example
 * ```typescript
 * const data = await withTimeout(
 *   supabase.from('cdts').select('*'),
 *   8000
 * );
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T> | PromiseLike<T>,
  timeoutMs: number = 8000
): Promise<T> {
  let timeoutId: any;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([Promise.resolve(promise), timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Wrapper específico para queries de Supabase
 * Aplica timeout + manejo de errores estandarizado
 *
 * @example
 * ```typescript
 * const { data, error } = await supabaseWithTimeout(
 *   supabase.from('cdts').select('*')
 * );
 * ```
 */
export async function supabaseWithTimeout<T>(
  query: PromiseLike<{ data: T | null; error: any }>,
  timeoutMs: number = 8000
): Promise<{ data: T | null; error: any }> {
  try {
    return await withTimeout(query, timeoutMs);
  } catch (error) {
    if (error instanceof TimeoutError) {
      return {
        data: null,
        error: {
          message: 'Network timeout - check your connection',
          code: 'TIMEOUT',
          details: error.message,
        },
      };
    }
    throw error;
  }
}
