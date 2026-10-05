import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { hasUnsavedChanges, registerUnsavedChanges, useHasUnsavedChanges } from './unsavedChanges';

describe('unsavedChanges', () => {
  it('stays set while any registered form is dirty', () => {
    const first = registerUnsavedChanges();
    const second = registerUnsavedChanges();
    expect(hasUnsavedChanges()).toBe(true);

    first();
    expect(hasUnsavedChanges()).toBe(true);
    second();
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('ignores a repeated unregister', () => {
    const first = registerUnsavedChanges();
    const second = registerUnsavedChanges();
    first();
    first();
    expect(hasUnsavedChanges()).toBe(true);
    second();
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('re-renders subscribers on change', () => {
    const { result } = renderHook(() => useHasUnsavedChanges());
    expect(result.current).toBe(false);

    let unregister: () => void = () => undefined;
    act(() => {
      unregister = registerUnsavedChanges();
    });
    expect(result.current).toBe(true);
    act(() => {
      unregister();
    });
    expect(result.current).toBe(false);
  });
});
