import { toast } from 'react-hot-toast';

import { describe, expect, it, vi } from 'vitest';

import { showToast } from './toast.utils';

vi.mock('react-hot-toast', () => ({
  toast: {
    custom: vi.fn((renderFn, _options) => {
      // Execute the render callback for coverage
      renderFn({ id: 'mock-toast-id', visible: true });
      return 'mock-toast-id';
    }),
    dismiss: vi.fn(),
  },
}));

describe('toast.utils', () => {
  it('triggers custom toast with default options', () => {
    const id = showToast({ title: 'Basic Message' });

    expect(id).toBe('mock-toast-id');
    expect(toast.custom).toHaveBeenCalledWith(expect.any(Function), {
      duration: 4000,
    });
  });

  it('provides convenience helpers: success, error, warning, info', () => {
    showToast.success('Success Title', 'Success Detail', 5000);
    expect(toast.custom).toHaveBeenCalled();

    showToast.error('Error Title', 'Error Detail');
    expect(toast.custom).toHaveBeenCalled();

    showToast.warning('Warning Title');
    expect(toast.custom).toHaveBeenCalled();

    showToast.info('Info Title');
    expect(toast.custom).toHaveBeenCalled();
  });

  it('delegates dismiss to react-hot-toast', () => {
    showToast.dismiss('toast-to-dismiss');
    expect(toast.dismiss).toHaveBeenCalledWith('toast-to-dismiss');

    showToast.dismiss();
    expect(toast.dismiss).toHaveBeenCalledWith(undefined);
  });
});
