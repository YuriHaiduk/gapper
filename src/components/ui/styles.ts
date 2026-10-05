/** Shared class strings for the monochrome theme (SPEC §6 Visual style). */
export const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-black dark:focus-visible:outline-white';

export const ICON_BUTTON = `flex size-11 items-center justify-center rounded-lg text-2xl leading-none hover:bg-neutral-100 dark:hover:bg-neutral-800 ${FOCUS_RING}`;

export const TEXT_LINK = `inline-flex min-h-11 items-center rounded-lg px-4 font-medium underline underline-offset-4 hover:decoration-2 ${FOCUS_RING}`;
