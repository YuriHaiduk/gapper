import { slugify, uniqueSlug } from '@/domain/slugify';
import { nowIso } from '@/domain/timestamps';
import type { Category } from '@/domain/types';
import { validateCategoryName } from '@/domain/validation';
import {
  deleteCategoryLocally,
  getCategory,
  getOtherCategory,
  listCategories,
  saveCategory,
} from '@/repositories/local/categoriesLocalRepo';
import { getMeta } from '@/repositories/local/metaRepo';
import { ValidationError } from './errors';

/** Validates `name` against the other non-deleted categories and returns a unique slug. */
async function checkName(name: string, selfId?: string): Promise<string> {
  const others = (await listCategories()).filter((category) => category.id !== selfId);
  const error = validateCategoryName(
    name,
    others.map((category) => category.name),
  );
  if (error) throw new ValidationError(error);
  return uniqueSlug(slugify(name.trim()), new Set(others.map((category) => category.slug)));
}

async function getEditable(id: string): Promise<Category> {
  const category = await getCategory(id);
  if (!category || category.deleted_at !== null) throw new Error(`Category ${id} not found`);
  if (category.is_system) throw new ValidationError('Other cannot be changed.');
  return category;
}

export async function createCategory(name: string): Promise<Category> {
  const slug = await checkName(name);
  // Local copy only: remote upserts omit user_id, the DB fills it from auth.uid() (D29).
  const userId = await getMeta('user_id');
  if (!userId) throw new Error('No signed-in user for local data');
  const now = nowIso();
  const category: Category = {
    id: crypto.randomUUID(),
    user_id: userId,
    name: name.trim(),
    slug,
    is_system: false,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    server_updated_at: null,
  };
  await saveCategory(category);
  return category;
}

/** Renames and regenerates the slug (SPEC §8.4). An unchanged name is a no-op. */
export async function renameCategory(id: string, name: string): Promise<Category> {
  const category = await getEditable(id);
  const slug = await checkName(name, id);
  const trimmed = name.trim();
  if (trimmed === category.name) return category;
  const renamed: Category = { ...category, name: trimmed, slug, updated_at: nowIso() };
  await saveCategory(renamed);
  return renamed;
}

/** Soft-deletes the category; its cards move to `Other` locally right away (SPEC §8.5). */
export async function deleteCategory(id: string): Promise<void> {
  const category = await getEditable(id);
  const other = await getOtherCategory();
  if (!other) throw new Error('Category Other is missing');
  await deleteCategoryLocally(category, other.id);
}
