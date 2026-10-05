import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import type { Card } from '@/domain/types';
import { cardErrorMessage, useCardActions } from '@/hooks/useCardActions';

/** One-tap Learning ⇄ Learned (FR-9, SPEC §7.2); the page re-renders from the live card. */
export function StatusToggle({ card }: { card: Pick<Card, 'id' | 'status'> }) {
  const { setStatus } = useCardActions();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const next = card.status === 'learning' ? 'learned' : 'learning';

  async function toggle() {
    setPending(true);
    setError(undefined);
    try {
      await setStatus(card.id, next);
    } catch (failure) {
      setError(cardErrorMessage(failure));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button pending={pending} onClick={() => void toggle()} className="whitespace-nowrap">
        {next === 'learned' ? 'Mark as learned' : 'Move to learning'}
      </Button>
      {error && <ErrorText role="alert">{error}</ErrorText>}
    </div>
  );
}
