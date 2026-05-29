// Estado global de cierre de sesión.
// Permite que _layout.tsx muestre una pantalla intermedia
// mientras se limpian los datos locales y Supabase procesa el signOut.

type Listener = () => void;
const listeners = new Set<Listener>();
let _active = false;

export const signOutState = {
  get active() { return _active; },

  begin() {
    _active = true;
    listeners.forEach((f) => f());
  },

  reset() {
    _active = false;
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
