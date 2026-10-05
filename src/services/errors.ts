import type { CardFieldErrors } from '@/domain/validation';

/** A user-facing rule violation; `message` is shown as-is. */
export class ValidationError extends Error {
  override name = 'ValidationError';
}

/** Card form validation failure with per-field messages (SPEC §7.1). */
export class CardValidationError extends ValidationError {
  override name = 'CardValidationError';
  readonly fields: CardFieldErrors;
  constructor(fields: CardFieldErrors) {
    super(Object.values(fields)[0] ?? 'Invalid card.');
    this.fields = fields;
  }
}

/** The row does not exist locally or is deleted. */
export class NotFoundError extends Error {
  override name = 'NotFoundError';
}
