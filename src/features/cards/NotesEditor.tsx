import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { ErrorText } from '@/components/ui/ErrorText';
import { BulletListIcon, NumberedListIcon, RedoIcon, UndoIcon } from '@/components/ui/icons';
import { FOCUS_RING } from '@/components/ui/styles';
import { normalizeRichText } from '@/domain/richText';
import type { RichText } from '@/domain/types';

/** Only what the toolbar offers (owner: bold, italic, lists, undo/redo — D43). */
const EXTENSIONS = [
  StarterKit.configure({
    blockquote: false,
    code: false,
    codeBlock: false,
    dropcursor: false,
    heading: false,
    horizontalRule: false,
    link: false,
    strike: false,
    trailingNode: false,
    underline: false,
  }),
];

const CONTENT_CLASS = `rich-text min-h-40 rounded-b-lg border border-neutral-300 bg-white px-3 py-2 text-base focus-visible:border-black aria-invalid:border-2 aria-invalid:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-visible:border-white dark:aria-invalid:border-neutral-100 ${FOCUS_RING}`;

/** The contenteditable acts as a labelled multiline textbox; errors mirror `TextField`. */
function contentAttributes(labelId: string, errorId: string, error: string | undefined) {
  return {
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-labelledby': labelId,
    ...(error && { 'aria-invalid': 'true', 'aria-describedby': errorId }),
    class: CONTENT_CLASS,
  };
}

export type NotesEditorProps = {
  label: string;
  value: RichText | null;
  onChange: (value: RichText | null) => void;
  disabled: boolean;
  error?: string | undefined;
};

/**
 * Notes field (SPEC §7.6): Tiptap editor with a monochrome toolbar. Lazy-loaded by the form.
 * `value` is the initial content only; the form remounts the editor (key) to reset it.
 */
export default function NotesEditor({ label, value, onChange, disabled, error }: NotesEditorProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value,
    editable: !disabled,
    editorProps: { attributes: contentAttributes(labelId, errorId, error) },
    onUpdate: ({ editor: current }) => {
      onChangeRef.current(normalizeRichText(current.getJSON() as RichText));
    },
  });

  // The error state and `disabled` change after creation.
  useEffect(() => {
    editor.setOptions({ editorProps: { attributes: contentAttributes(labelId, errorId, error) } });
    editor.setEditable(!disabled, false);
  }, [editor, labelId, errorId, error, disabled]);

  return (
    <div className="flex flex-col gap-1">
      <span id={labelId} className="text-sm font-medium">
        {label}
      </span>
      <Toolbar editor={editor} disabled={disabled} />
      <EditorContent editor={editor} />
      {error && <ErrorText id={errorId}>{error}</ErrorText>}
    </div>
  );
}

function Toolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap gap-1 rounded-t-lg border border-b-0 border-neutral-300 p-1 dark:border-neutral-700"
    >
      <ToolButton
        label="Bold"
        pressed={state.bold}
        disabled={disabled}
        onPress={() => chain().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </ToolButton>
      <ToolButton
        label="Italic"
        pressed={state.italic}
        disabled={disabled}
        onPress={() => chain().toggleItalic().run()}
      >
        <span className="font-serif italic">I</span>
      </ToolButton>
      <ToolButton
        label="Bullet list"
        pressed={state.bulletList}
        disabled={disabled}
        onPress={() => chain().toggleBulletList().run()}
      >
        <BulletListIcon />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        pressed={state.orderedList}
        disabled={disabled}
        onPress={() => chain().toggleOrderedList().run()}
      >
        <NumberedListIcon />
      </ToolButton>
      <span className="flex-1" />
      <ToolButton
        label="Undo"
        disabled={disabled || !state.canUndo}
        onPress={() => chain().undo().run()}
      >
        <UndoIcon />
      </ToolButton>
      <ToolButton
        label="Redo"
        disabled={disabled || !state.canRedo}
        onPress={() => chain().redo().run()}
      >
        <RedoIcon />
      </ToolButton>
    </div>
  );
}

type ToolButtonProps = {
  label: string;
  pressed?: boolean;
  disabled: boolean;
  onPress: () => void;
  children: ReactNode;
};

function ToolButton({ label, pressed, disabled, onPress, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      // Keep the editor's selection (and the iOS keyboard) when tapping a tool.
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={onPress}
      className={`flex size-11 items-center justify-center rounded-md text-lg hover:bg-neutral-100 disabled:opacity-40 aria-pressed:bg-neutral-900 aria-pressed:text-white dark:hover:bg-neutral-800 dark:aria-pressed:bg-white dark:aria-pressed:text-neutral-950 ${FOCUS_RING}`}
    >
      {children}
    </button>
  );
}
