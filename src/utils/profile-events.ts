type Listener = () => void;
const listeners = new Set<Listener>();

export const profileEvents = {
  emitReset: () => { listeners.forEach((fn) => fn()); },
  subscribe:  (fn: Listener) => {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};
