/** Shared class strings for the monochrome theme (SPEC §6 Visual style). */
export const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-black dark:focus-visible:outline-white';

export const ICON_BUTTON = `flex size-11 items-center justify-center rounded-lg text-2xl leading-none hover:bg-neutral-100 dark:hover:bg-neutral-800 ${FOCUS_RING}`;

export const TEXT_LINK = `inline-flex min-h-11 items-center rounded-lg px-4 font-medium underline underline-offset-4 hover:decoration-2 ${FOCUS_RING}`;

/** Text input / textarea / select look; 16 px text prevents iOS zoom on focus. */
export const FIELD = `min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base focus-visible:border-black disabled:opacity-60 aria-invalid:border-2 aria-invalid:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-visible:border-white dark:aria-invalid:border-neutral-100 ${FOCUS_RING}`;
