import type { ReactNode } from 'react';
import type { RichNode, RichText } from '@/domain/types';

/**
 * Renders a notes document as React elements (D42) — never via `innerHTML`, so stored content
 * can't inject markup. Only the node/mark types the editor produces are rendered; anything
 * else falls back to its children (text is never lost).
 */
function renderText(node: RichNode, key: number): ReactNode {
  let out: ReactNode = node.text ?? '';
  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') out = <strong>{out}</strong>;
    else if (mark.type === 'italic') out = <em>{out}</em>;
  }
  return <span key={key}>{out}</span>;
}

function renderNodes(nodes: readonly RichNode[] | undefined): ReactNode[] {
  return (nodes ?? []).map((node, index) => renderNode(node, index));
}

function renderNode(node: RichNode, key: number): ReactNode {
  switch (node.type) {
    case 'text':
      return renderText(node, key);
    case 'hardBreak':
      return <br key={key} />;
    case 'paragraph':
      // An empty paragraph keeps its line height, as in the editor.
      return <p key={key}>{node.content?.length ? renderNodes(node.content) : <br />}</p>;
    case 'bulletList':
      return <ul key={key}>{renderNodes(node.content)}</ul>;
    case 'orderedList':
      return <ol key={key}>{renderNodes(node.content)}</ol>;
    case 'listItem':
      return <li key={key}>{renderNodes(node.content)}</li>;
    default:
      return <div key={key}>{renderNodes(node.content)}</div>;
  }
}

type RichTextViewProps = { doc: RichText; className?: string };

export function RichTextView({ doc, className = '' }: RichTextViewProps) {
  return <div className={`rich-text break-words ${className}`}>{renderNodes(doc.content)}</div>;
}
