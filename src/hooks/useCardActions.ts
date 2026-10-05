import { createCard, deleteCard, setStatus, updateCard } from '@/services/cardService';
import { CardValidationError, ValidationError } from '@/services/errors';

export type { CardInput } from '@/services/cardService';

const actions = { createCard, updateCard, setStatus, deleteCard };

/** Card write actions for the UI (keeps pages off the service layer, see architecture.md). */
export function useCardActions() {
  return actions;
}

/** Per-field messages when the service rejected the input, else undefined. */
export function cardFieldErrors(error: unknown) {
  return error instanceof CardValidationError ? error.fields : undefined;
}

/** User-facing message for a failed card write (SPEC §25). */
export function cardErrorMessage(error: unknown): string {
  return error instanceof ValidationError ? error.message : "Couldn't save.";
}
