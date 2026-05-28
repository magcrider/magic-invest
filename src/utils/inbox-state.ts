// MOCK — reemplazar por queries SQLite cuando el Buzón se conecte a datos reales.
//
// Migración pendiente:
//   markRead(id)    → UPDATE inbox_events SET read_at = datetime('now') WHERE id = ?
//                     luego sync write-through a Supabase (columna read_at)
//   markUnread(id)  → UPDATE inbox_events SET read_at = NULL WHERE id = ?
//   markDeleted(id) → UPDATE inbox_events SET dismissed_at = datetime('now') WHERE id = ?
//                     (no borrar el registro — dismissed_at = soft delete)
//
// El campo isRead se deriva de: read_at IS NOT NULL
// El campo isDeleted se deriva de: dismissed_at IS NOT NULL

type Listener = () => void;

const readIds    = new Set<string>();
const unreadIds  = new Set<string>(); // override explícito para eventos inicialmente leídos
const deletedIds = new Set<string>();
const listeners  = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

export const inboxState = {
  markRead:    (id: string) => { readIds.add(id);    unreadIds.delete(id); notify(); },
  markUnread:  (id: string) => { readIds.delete(id); unreadIds.add(id);    notify(); },
  markDeleted: (id: string) => { deletedIds.add(id);                       notify(); },
  isRead:      (id: string) => readIds.has(id),
  isUnread:    (id: string) => unreadIds.has(id),
  isDeleted:   (id: string) => deletedIds.has(id),
  subscribe:   (fn: Listener) => {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};
