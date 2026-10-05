const FALLBACK_SLUG = 'category';

/**
 * Category slug from its name (SPEC §8.4). Accents are stripped from Latin letters only
 * (`Café` → `cafe`); other scripts keep their letters intact (`Їжа` → `їжа`, not `іжа`).
 */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/(\p{Script=Latin})\p{M}+/gu, '$1')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  return slug === '' ? FALLBACK_SLUG : slug;
}

/** Appends `-2`, `-3`, … until the slug is not in `taken`. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}
