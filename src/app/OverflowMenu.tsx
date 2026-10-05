import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/auth/useAuth';

const ITEM =
  'flex min-h-11 w-full items-center px-4 text-left text-base hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800';

/** Header ⋯ menu (SPEC §6). "Sync now" is added together with the sync engine. */
export function OverflowMenu() {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    // Replace whatever `/login?redirect=…` the guard may have produced on the auth event.
    await navigate('/login', { replace: true });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="flex size-11 items-center justify-center rounded-lg text-2xl leading-none hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-neutral-800"
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {open && (
        <ul
          id={menuId}
          className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          <li>
            <Link
              to="/categories"
              className={ITEM}
              onClick={() => {
                setOpen(false);
              }}
            >
              Categories
            </Link>
          </li>
          <li>
            <button
              type="button"
              className={ITEM}
              disabled={signingOut}
              onClick={() => void handleSignOut()}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
