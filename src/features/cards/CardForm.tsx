import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import {
  isPartOfSpeech,
  PARTS_OF_SPEECH,
  partOfSpeechLabel,
  type PartOfSpeech,
} from '@/domain/partsOfSpeech';
import { sameRichText } from '@/domain/richText';
import type { AudioChange, Card, CardStatus, Category, RichText } from '@/domain/types';
import { validateCardInput, type CardFieldErrors } from '@/domain/validation';
import { cardErrorMessage, cardFieldErrors } from '@/hooks/useCardActions';
import { useDuplicateTitle } from '@/hooks/useDuplicateTitle';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { AudioRecorder } from '@/features/audio/AudioRecorder';
import { NotesField } from './NotesField';
import { StatusField } from './StatusField';

export type CardFormValues = {
  title: string;
  notes: RichText | null;
  type: PartOfSpeech | null;
  category_id: string;
  status: CardStatus;
  /** What saving does with the recording (SPEC §10.3). */
  audio: AudioChange;
};

export const KEEP_AUDIO: AudioChange = { kind: 'keep' };

function sameAudio(a: AudioChange, b: AudioChange): boolean {
  return a.kind === 'replace' || b.kind === 'replace' ? a === b : a.kind === b.kind;
}

function sameValues(a: CardFormValues, b: CardFormValues): boolean {
  return (
    a.title === b.title &&
    a.type === b.type &&
    a.category_id === b.category_id &&
    a.status === b.status &&
    sameRichText(a.notes, b.notes) &&
    sameAudio(a.audio, b.audio)
  );
}

type CardFormProps = {
  mode: 'create' | 'edit';
  initial: CardFormValues;
  categories: Category[];
  /** The edited card, excluded from the duplicate-title hint. */
  selfId?: string;
  /** The edited card's saved recording. */
  audioPath?: string | null;
  onSave: (values: CardFormValues) => Promise<Card>;
  /** Called after a plain Save (not "Save & add another"); navigates away unprompted. */
  onSaved: (card: Card) => void;
  /** Resolves `false` when the user cancelled (the form keeps guarding unsaved changes). */
  onDelete?: () => Promise<boolean>;
};

/** Create/edit form (SPEC §7.1, §7.6): validation under fields, duplicate hint, bottom actions. */
export function CardForm({
  mode,
  initial,
  categories,
  selfId,
  audioPath = null,
  onSave,
  onSaved,
  onDelete,
}: CardFormProps) {
  const [values, setValues] = useState(initial);
  // What "no unsaved changes" means: the initial values, or the reset form after "add another".
  const [baseline, setBaseline] = useState(initial);
  const [errors, setErrors] = useState<CardFieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  // Asking for the microphone or recording: saving waits for Stop (D46).
  const [recording, setRecording] = useState(false);
  const [savedTitle, setSavedTitle] = useState<string>();
  const [focusRequest, setFocusRequest] = useState(0);
  // Bumped by "Save & add another" to remount (clear) the notes editor.
  const [resetCount, setResetCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const duplicate = useDuplicateTitle(values.title, selfId);
  const dirty = !sameValues(values, baseline);
  const leave = useLeaveGuard(dirty);

  useEffect(() => {
    if (mode === 'create') titleRef.current?.focus();
  }, [mode]);

  // After a failed submit: focus the first invalid field; after "add another": the title.
  useEffect(() => {
    if (focusRequest === 0) return;
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (invalid ?? titleRef.current)?.focus();
  }, [focusRequest]);

  function set<K extends keyof CardFormValues>(key: K, value: CardFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setSavedTitle(undefined);
    if (key in errors) setErrors(({ [key]: _, ...rest }) => rest);
  }

  const setAudio = useCallback((audio: AudioChange) => {
    setValues((current) => ({ ...current, audio }));
    setSavedTitle(undefined);
  }, []);

  async function save(addAnother: boolean) {
    if (recording) return;
    setFormError(undefined);
    const fieldErrors = validateCardInput(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      setFocusRequest((n) => n + 1);
      return;
    }
    setPending(true);
    try {
      const card = await onSave(values);
      if (!addAnother) {
        await leave(() => {
          onSaved(card);
        });
        return;
      }
      const next = { ...initial, category_id: values.category_id };
      setValues(next);
      setBaseline(next);
      setResetCount((n) => n + 1);
      setSavedTitle(card.title);
      setFocusRequest((n) => n + 1);
    } catch (error) {
      const serverFields = cardFieldErrors(error);
      if (serverFields) {
        setErrors(serverFields);
        setFocusRequest((n) => n + 1);
      } else {
        setFormError(cardErrorMessage(error));
      }
    }
    setPending(false);
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(false);
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4">
      <div className="flex flex-col gap-1">
        <TextField
          ref={titleRef}
          label="Title"
          value={values.title}
          error={errors.title}
          disabled={pending}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          enterKeyHint="next"
          onChange={(event) => {
            set('title', event.target.value);
          }}
        />
        <p aria-live="polite" className="text-sm text-neutral-600 dark:text-neutral-400">
          {duplicate && (
            <>
              You already have a card{' '}
              <Link to={`/cards/${duplicate.id}`} className="font-medium underline">
                “{duplicate.title}”
              </Link>
              .
            </>
          )}
        </p>
      </div>
      <AudioRecorder
        key={`audio-${resetCount}`}
        existingPath={audioPath}
        cardId={selfId}
        value={values.audio}
        onChange={setAudio}
        onBusyChange={setRecording}
        disabled={pending}
      />
      <Select
        label="Part of speech"
        value={values.type ?? ''}
        disabled={pending}
        onChange={(event) => {
          const { value } = event.target;
          set('type', isPartOfSpeech(value) ? value : null);
        }}
      >
        <option value="">—</option>
        {PARTS_OF_SPEECH.map((type) => (
          <option key={type} value={type}>
            {partOfSpeechLabel(type)}
          </option>
        ))}
      </Select>
      <NotesField
        key={resetCount}
        label="Notes"
        value={values.notes}
        error={errors.notes}
        disabled={pending}
        onChange={(notes) => {
          set('notes', notes);
        }}
      />
      <Select
        label="Category"
        value={values.category_id}
        disabled={pending}
        onChange={(event) => {
          set('category_id', event.target.value);
        }}
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      {mode === 'edit' && (
        <StatusField
          value={values.status}
          disabled={pending}
          onChange={(status: CardStatus) => {
            set('status', status);
          }}
        />
      )}
      {onDelete && (
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => void leave(onDelete)}
          className="self-start"
        >
          Delete card
        </Button>
      )}

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-neutral-200 bg-white py-3 dark:border-neutral-800 dark:bg-neutral-950">
        {formError && <ErrorText role="alert">{formError}</ErrorText>}
        <p role="status" className="text-sm">
          {savedTitle && `Saved “${savedTitle}”.`}
        </p>
        <div className="flex gap-2">
          <Button type="submit" pending={pending} disabled={recording} className="flex-1">
            Save
          </Button>
          {mode === 'create' && (
            <Button
              variant="secondary"
              disabled={pending || recording}
              onClick={() => void save(true)}
              className="flex-1"
            >
              Save &amp; add another
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
