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
