import { createCategory, deleteCategory, renameCategory } from '@/services/categoryService';
import { ValidationError } from '@/services/errors';

const actions = { createCategory, renameCategory, deleteCategory };

/** Category write actions for the UI (keeps pages off the service layer, see architecture.md). */
export function useCategoryActions() {
  return actions;
}

/** User-facing message for a failed category write. */
export function categoryErrorMessage(error: unknown): string {
  return error instanceof ValidationError ? error.message : "Couldn't save.";
}
