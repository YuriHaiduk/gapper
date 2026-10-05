import type { RichNode, RichText } from './types';

/**
 * Notes are Tiptap/ProseMirror JSON documents (SPEC §7.1, D42). Pure helpers only — the
 * editor itself lives in `features/cards/NotesEditor`.
 */

const isInline = (node: RichNode) => node.type === 'text' || node.type === 'hardBreak';

function inlineText(nodes: readonly RichNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return node.text ?? '';
      if (node.type === 'hardBreak') return '\n';
      return inlineText(node.content ?? []);
    })
    .join('');
}

function blockLines(node: RichNode | RichText): string[] {
  const children = node.content ?? [];
  if (children.every(isInline)) return [inlineText(children)];
  return children.flatMap(blockLines);
}

/** Plain text, one line per block (paragraph / list item). Empty string for null. */
export function richTextToPlain(doc: RichText | null | undefined): string {
  return doc ? blockLines(doc).join('\n').trim() : '';
}

/** One paragraph per line; null for blank text (tests, migration parity). */
export function plainToRichText(text: string | null | undefined): RichText | null {
  const trimmed = text?.trim() ?? '';
  if (trimmed === '') return null;
  return {
    type: 'doc',
    content: trimmed
      .split(/\r?\n/)
      .map((line) =>
        line === ''
          ? { type: 'paragraph' }
          : { type: 'paragraph', content: [{ type: 'text', text: line }] },
      ),
  };
}

/** Empty notes are stored as null (SPEC §7.1). */
export function normalizeRichText(doc: RichText | null | undefined): RichText | null {
  return doc && richTextToPlain(doc) !== '' ? doc : null;
}

/** Structural equality (dirty check, unchanged-edit no-op). */
export function sameRichText(a: RichText | null, b: RichText | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Serialized size, bounded by the DB check constraint (`cards_notes_ck`). */
export function richTextBytes(doc: RichText): number {
  return new TextEncoder().encode(JSON.stringify(doc)).length;
}
