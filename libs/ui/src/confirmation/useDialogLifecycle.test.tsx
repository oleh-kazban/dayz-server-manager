import { type RefObject, useRef } from 'react';

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { showModalFollowingDialogFocusingSteps } from './__fixtures__/dialogFocusingSteps';
import { useDialogLifecycle } from './useDialogLifecycle';

interface DialogHarnessProps {
  initialFocus: 'none' | 'second' | 'unattached';
}

function DialogHarness({ initialFocus }: DialogHarnessProps) {
  const secondRef = useRef<HTMLButtonElement>(null);
  const unattachedRef = useRef<HTMLButtonElement>(null);
  const refs: Record<
    DialogHarnessProps['initialFocus'],
    RefObject<HTMLElement | null> | undefined
  > = { none: undefined, second: secondRef, unattached: unattachedRef };
  const { dialogRef } = useDialogLifecycle({
    initialFocusRef: refs[initialFocus],
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
  });

  return (
    <dialog ref={dialogRef} aria-label="Harness dialog">
      <button type="button">First</button>
      <button ref={secondRef} type="button">
        Second
      </button>
    </dialog>
  );
}

describe('useDialogLifecycle initial focus', () => {
  const originalShowModal = HTMLDialogElement.prototype.showModal;

  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = showModalFollowingDialogFocusingSteps;
  });

  afterEach(() => {
    HTMLDialogElement.prototype.showModal = originalShowModal;
  });

  it.each([
    {
      initialFocus: 'second',
      focused: 'Second',
      behaviour: 'moves focus to the initial-focus element after the dialog opens',
    },
    {
      initialFocus: 'none',
      focused: 'First',
      behaviour: 'leaves the browser default focus when no initial-focus element is given',
    },
    {
      initialFocus: 'unattached',
      focused: 'First',
      behaviour: 'leaves the browser default focus when the initial-focus ref is not attached',
    },
  ] as const)('$behaviour (focuses "$focused")', ({ initialFocus, focused }) => {
    render(<DialogHarness initialFocus={initialFocus} />);

    expect(screen.getByRole('dialog', { name: 'Harness dialog' })).toHaveAttribute('open');
    expect(screen.getByRole('button', { name: focused })).toHaveFocus();
  });
});
