import { useState, type SyntheticEvent } from 'react';
import type { SignInError } from '@/auth/authService';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { validateLogin, type LoginFieldErrors } from '@/domain/loginValidation';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const ERROR_MESSAGES: Record<SignInError, string> = {
  invalid_credentials: 'Incorrect email or password.',
  offline: "You're offline. Signing in requires a connection.",
  unknown: "Couldn't sign in. Try again.",
};

/** Email + password sign-in. No sign-up or password reset by design (SPEC §9). */
export function LoginPage() {
  const { signIn } = useAuth();
  const online = useOnlineStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [error, setError] = useState<SignInError | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    const errors = validateLogin({ email, password });
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    const result = await signIn(email, password);
    // On success the /login guard redirects; keep the pending state until it unmounts us.
    if (!result.ok) {
      setError(result.error);
      setPending(false);
    }
  }

  const message = error ? ERROR_MESSAGES[error] : online ? null : ERROR_MESSAGES.offline;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 pt-[max(1.5rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Gapper</h1>
        <p className="text-neutral-600 dark:text-neutral-400">Sign in to your vocabulary</p>
      </div>
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-4"
      >
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="next"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          disabled={pending}
          error={fieldErrors.email}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          enterKeyHint="go"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          disabled={pending}
          error={fieldErrors.password}
        />
        <Button type="submit" pending={pending} className="mt-2">
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
        <div role="alert" className="min-h-6 text-center text-sm text-red-700 dark:text-red-400">
          {message}
        </div>
      </form>
    </main>
  );
}
