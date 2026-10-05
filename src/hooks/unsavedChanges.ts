import { useSyncExternalStore } from 'react';

/**
 * App-wide "a form has unsaved changes" flag. Forms register through `useLeaveGuard`; the
 * update prompt stays hidden while it is set so a reload never drops typed data (SPEC §22).
 */
let dirtyForms = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Marks one form dirty; returns the function that unmarks it. */
export function registerUnsavedChanges(): () => void {
  dirtyForms += 1;
  emit();
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    dirtyForms -= 1;
    emit();
  };
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function hasUnsavedChanges(): boolean {
  return dirtyForms > 0;
}

export function useHasUnsavedChanges(): boolean {
  return useSyncExternalStore(subscribe, hasUnsavedChanges);
}
