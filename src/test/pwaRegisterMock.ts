import { useSyncExternalStore } from 'react';

/**
 * Test stand-in for `virtual:pwa-register/react` (aliased in vite.config.ts): no service
 * worker, a controllable "new version waiting" flag and a recorded update call.
 */
let needRefresh = false;
const listeners = new Set<() => void>();

export const pwaRegister = {
  updateCalls: [] as (boolean | undefined)[],
  setNeedRefresh(value: boolean) {
    needRefresh = value;
    for (const listener of listeners) listener();
  },
  reset() {
    this.updateCalls = [];
    this.setNeedRefresh(false);
  },
};

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useRegisterSW() {
  const value = useSyncExternalStore(subscribe, () => needRefresh);
  return {
    needRefresh: [
      value,
      (next: boolean) => {
        pwaRegister.setNeedRefresh(next);
      },
    ] as const,
    offlineReady: [false, () => undefined] as const,
    updateServiceWorker: (reloadPage?: boolean) => {
      pwaRegister.updateCalls.push(reloadPage);
      return Promise.resolve();
    },
  };
}
