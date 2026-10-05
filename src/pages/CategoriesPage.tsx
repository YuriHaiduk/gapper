import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { Spinner } from '@/components/ui/Spinner';
import { deleteCategoryPrompt } from '@/domain/categories';
import type { Category } from '@/domain/types';
import { CategoryForm } from '@/features/categories/CategoryForm';
import { CategoryRow } from '@/features/categories/CategoryRow';
import { categoryErrorMessage, useCategoryActions } from '@/hooks/useCategoryActions';
import { useCategories } from '@/hooks/useCategories';
import { useCategoryCounts } from '@/hooks/useCategoryCounts';

type Editing = { kind: 'create' } | { kind: 'rename'; id: string } | null;

/** Category management (SPEC §8.5): counts, create, inline rename, delete → Other. */
export function CategoriesPage() {
  const categories = useCategories();
  const counts = useCategoryCounts();
  const { createCategory, renameCategory, deleteCategory } = useCategoryActions();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleteError, setDeleteError] = useState<string>();

  if (categories === undefined || counts === undefined) {
    return (
      <div role="status" className="flex justify-center py-12 text-neutral-500">
        <Spinner />
        <span className="sr-only">Loading categories…</span>
      </div>
    );
  }

  const stopEditing = () => {
    setEditing(null);
  };

  async function handleDelete(category: Category) {
    setDeleteError(undefined);
    if (!window.confirm(deleteCategoryPrompt(category.name, counts?.[category.id] ?? 0))) return;
    try {
      await deleteCategory(category.id);
    } catch (error) {
      setDeleteError(categoryErrorMessage(error));
    }
  }

  const onlyOther = categories.every((category) => category.is_system);

  return (
    <div className="flex flex-col gap-2 pt-4">
      {editing?.kind === 'create' ? (
        <CategoryForm label="New category" onSubmit={createCategory} onDone={stopEditing} />
      ) : (
        <Button
          onClick={() => {
            setDeleteError(undefined);
            setEditing({ kind: 'create' });
          }}
        >
          New category
        </Button>
      )}
      {deleteError && <ErrorText role="alert">{deleteError}</ErrorText>}
      {onlyOther && (
        <p className="py-4 text-center text-neutral-600 dark:text-neutral-400">
          Create categories to organize your cards.
        </p>
      )}
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {categories.map((category) => (
          <li key={category.id}>
            {editing?.kind === 'rename' && editing.id === category.id ? (
              <CategoryForm
                label="Category name"
                initialName={category.name}
                onSubmit={(name) => renameCategory(category.id, name)}
                onDone={stopEditing}
              />
            ) : (
              <CategoryRow
                category={category}
                count={counts[category.id] ?? 0}
                disabled={editing !== null}
                onRename={() => {
                  setDeleteError(undefined);
                  setEditing({ kind: 'rename', id: category.id });
                }}
                onDelete={() => void handleDelete(category)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
