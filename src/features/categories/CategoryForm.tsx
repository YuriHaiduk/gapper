import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { categoryErrorMessage } from '@/hooks/useCategoryActions';

type CategoryFormProps = {
  label: string;
  initialName?: string;
  onSubmit: (name: string) => Promise<unknown>;
  onDone: () => void;
};

/** Name form for creating or renaming a category; shows validation errors inline. */
export function CategoryForm({ label, initialName = '', onSubmit, onDone }: CategoryFormProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on open and back on the field after a failed save, so the user can fix the name.
  useEffect(() => {
    inputRef.current?.focus();
  }, [error]);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      await onSubmit(name);
      onDone();
    } catch (err) {
      setError(categoryErrorMessage(err));
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-3 py-3"
    >
      <TextField
        ref={inputRef}
        label={label}
        value={name}
        error={error}
        autoComplete="off"
        autoCapitalize="sentences"
        enterKeyHint="done"
        disabled={pending}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onDone();
        }}
        onChange={(event) => {
          setName(event.target.value);
        }}
      />
      <div className="flex gap-2">
        <Button type="submit" pending={pending} className="flex-1">
          Save
        </Button>
        <Button variant="secondary" disabled={pending} onClick={onDone} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}
