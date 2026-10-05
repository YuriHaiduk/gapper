import { useCallback, useEffect, useRef } from 'react';
import { useBlocker, type BlockerFunction } from 'react-router';
import { registerUnsavedChanges } from './unsavedChanges';

export const DISCARD_CHANGES_PROMPT = 'Discard unsaved changes?';

/**
 * Asks before leaving a form with unsaved changes (SPEC §7.6, D41): in-app navigation incl.
 * browser Back via `useBlocker` + native confirm (D32), reload/tab close via `beforeunload`;
 * while dirty, the app update prompt is hidden (D55).
 * `leave(action)` runs a navigation the form itself triggers (after save/delete) unprompted;
 * if `action` returns `false` or throws, guarding resumes.
 */
export function useLeaveGuard(dirty: boolean) {
  const bypass = useRef(false);

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      !bypass.current &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
    [dirty],
  );
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(DISCARD_CHANGES_PROMPT)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    const unregister = registerUnsavedChanges();
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      unregister();
    };
  }, [dirty]);

  return useCallback(async (action: () => unknown) => {
    bypass.current = true;
    try {
      if ((await action()) === false) bypass.current = false;
    } catch (error) {
      bypass.current = false;
      throw error;
    }
  }, []);
}
