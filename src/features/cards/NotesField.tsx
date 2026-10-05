import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { RichTextView } from '@/components/ui/RichTextView';
import type { RichText } from '@/domain/types';
import type { NotesEditorProps } from './NotesEditor';

type NotesEditorComponent = (props: NotesEditorProps) => ReactNode;

let loaded: NotesEditorComponent | null = null;
let loading: Promise<NotesEditorComponent> | null = null;

/**
 * Loads the Tiptap chunk once per session; a failed load (offline before it was ever
 * fetched) is forgotten so Retry can try again.
 */
export function loadNotesEditor(): Promise<NotesEditorComponent> {
  loading ??= import('./NotesEditor').then(
    (module) => (loaded = module.default),
    (error: unknown) => {
      loading = null;
      throw error;
    },
  );
  return loading;
}

/** Warms the chunk after start so the form opens offline later in the session (D54). */
export function preloadNotesEditor(): void {
  loadNotesEditor().catch(() => undefined);
}

type LoadState =
  { kind: 'loading' } | { kind: 'ready'; Editor: NotesEditorComponent } | { kind: 'failed' };

const initialState = (): LoadState =>
  loaded ? { kind: 'ready', Editor: loaded } : { kind: 'loading' };

/**
 * Notes field of the card form (SPEC §7.6): the lazy editor, or — if its chunk can't load —
 * the current notes read-only with Retry; saving then keeps the notes unchanged.
 */
export function NotesField(props: NotesEditorProps) {
  const [state, setState] = useState(initialState);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (loaded) return;
    let active = true;
    loadNotesEditor().then(
      (Editor) => {
        if (active) setState({ kind: 'ready', Editor });
      },
      () => {
        if (active) setState({ kind: 'failed' });
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  if (state.kind === 'ready') return <state.Editor {...props} />;
  if (state.kind === 'loading') return <NotesLoading label={props.label} />;
  return (
    <NotesUnavailable
      label={props.label}
      value={props.value}
      onRetry={() => {
        setState({ kind: 'loading' });
        setAttempt((n) => n + 1);
      }}
    />
  );
}

function NotesLoading({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <div
        role="status"
        className="min-h-52 rounded-lg border border-neutral-300 px-3 py-2 text-neutral-500 dark:border-neutral-700"
      >
        Loading editor…
      </div>
    </div>
  );
}

type NotesUnavailableProps = { label: string; value: RichText | null; onRetry: () => void };

function NotesUnavailable({ label, value, onRetry }: NotesUnavailableProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <div className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700">
        {value ? <RichTextView doc={value} /> : <p className="text-neutral-500">No notes.</p>}
      </div>
      <ErrorText role="alert">
        {"The notes editor couldn't load. Connect to the internet and try again."}
      </ErrorText>
      <Button variant="secondary" onClick={onRetry} className="self-start">
        Retry
      </Button>
    </div>
  );
}
