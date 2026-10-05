/** A user-facing rule violation; `message` is shown as-is. */
export class ValidationError extends Error {
  override name = 'ValidationError';
}
