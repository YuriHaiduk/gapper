import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RichText } from '@/domain/types';
import { RichTextView } from './RichTextView';

const DOC: RichText = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'He ' },
        { type: 'text', text: 'abandoned', marks: [{ type: 'bold' }, { type: 'italic' }] },
        { type: 'text', text: ' <img src=x onerror=alert(1)>' },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }],
        },
      ],
    },
    {
      type: 'orderedList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }],
        },
      ],
    },
    {
      type: 'mystery',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'kept' }] }],
    },
  ],
};

describe('RichTextView', () => {
  it('renders paragraphs, marks and lists as elements', () => {
    const { container } = render(<RichTextView doc={DOC} />);
    expect(container.querySelector('strong em, em strong')).toHaveTextContent('abandoned');
    expect(within('ul')).toBe('one');
    expect(within('ol')).toBe('two');
    expect(screen.getByText('kept')).toBeInTheDocument();

    function within(selector: string) {
      return container.querySelector(selector)?.textContent;
    }
  });

  it('renders stored markup as text, never as HTML', () => {
    const { container } = render(<RichTextView doc={DOC} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('<img src=x onerror=alert(1)>');
  });
});
