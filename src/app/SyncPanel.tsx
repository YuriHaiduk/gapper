import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { useFailedEntries, type FailedEntry } from '@/hooks/useFailedEntries';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSyncStatus } from '@/sync/useSyncStatus';

type SyncPanelProps = { open: boolean; onClose: () => void };

/**
 * Failed outbox entries with Retry / Discard (SPEC §15.2, §15.6, D53). Native `<dialog>`
 * like the filter sheet: bottom sheet on phones, panel on wider screens.
 */
export function SyncPanel({ open, onClose }: SyncPanelProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // The click handler only detects taps on the backdrop; keyboard users close with Escape/Close.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-label="Sync errors"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl bg-white p-0 text-neutral-900 backdrop:bg-black/40 sm:m-auto sm:max-w-md sm:rounded-2xl dark:bg-neutral-900 dark:text-neutral-100"
    >
      {open && <SyncPanelBody onClose={onClose} />}
    </dialog>
  );
}

function SyncPanelBody({ onClose }: { onClose: () => void }) {
  const entries = useFailedEntries();
  const { retryFailed } = useSyncStatus();

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <h2 className="text-lg font-semibold">Sync errors</h2>
      {entries?.length === 0 && (
        <p className="text-neutral-600 dark:text-neutral-400">No sync errors.</p>
      )}
      {entries && entries.length > 0 && (
        <>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            The server rejected these changes. Retry them, or discard to restore the server version.
          </p>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {entries.map((entry) => (
              <FailedRow key={entry.id} entry={entry} />
            ))}
          </ul>
          {entries.length > 1 && (
            <Button
              variant="secondary"
              onClick={() => void retryFailed(entries.map((entry) => entry.id))}
            >
              Retry all
            </Button>
          )}
        </>
      )}
      <Button onClick={onClose}>Close</Button>
    </div>
  );
}

function FailedRow({ entry }: { entry: FailedEntry }) {
  const { retryFailed, discardFailed } = useSyncStatus();
  const online = useOnlineStatus();
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState(false);

  async function discard() {
    if (!window.confirm(`Discard the change to ${entry.label}? The server version is kept.`)) {
      return;
    }
    setDiscarding(true);
    setError(false);
    try {
      await discardFailed(entry.id);
    } catch {
      setError(true);
      setDiscarding(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 py-3">
      <p className="font-medium break-words">{entry.label}</p>
      <p className="text-sm break-words text-neutral-600 dark:text-neutral-400">{entry.error}</p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => void retryFailed([entry.id])}>
          Retry
        </Button>
        <Button
          variant="secondary"
          pending={discarding}
          disabled={!online}
          onClick={() => void discard()}
        >
          Discard
        </Button>
      </div>
      {!online && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Discarding needs a connection.
        </p>
      )}
      {error && <ErrorText role="alert">{"Couldn't discard. Try again."}</ErrorText>}
    </li>
  );
}
