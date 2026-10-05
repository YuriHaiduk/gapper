export type LoginInput = { email: string; password: string };
export type LoginFieldErrors = Partial<Record<keyof LoginInput, string>>;

// Intentionally loose: the server is the real authority, this only catches typos.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin({ email, password }: LoginInput): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const trimmed = email.trim();
  if (trimmed === '') errors.email = 'Enter your email.';
  else if (!EMAIL_PATTERN.test(trimmed)) errors.email = 'Enter a valid email.';
  if (password === '') errors.password = 'Enter your password.';
  return errors;
}
