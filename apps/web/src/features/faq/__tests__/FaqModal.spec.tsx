import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FaqModal } from '../FaqModal';
import { useFaqStore } from '../useFaqStore';
import * as useStaticDocModule from '../useStaticDoc';

vi.mock('../useStaticDoc', () => ({
  useStaticDoc: vi.fn(),
}));

describe('FaqModal', () => {
  const mockRefetch = vi.fn();
  let originalOffsetParent: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    useFaqStore.setState({
      isOpen: false,
      activeTab: 'faq',
      searchQuery: '',
    });

    vi.mocked(useStaticDocModule.useStaticDoc).mockReturnValue({
      data: '# Operator Cheatsheet\n\n## Network Ports\n2302 UDP Game Port',
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useStaticDocModule.useStaticDoc>);

    originalOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      get() {
        return this.parentNode;
      },
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalOffsetParent) {
      Object.defineProperty(HTMLElement.prototype, 'offsetParent', originalOffsetParent);
    } else {
      // @ts-expect-error - reset if not originally defined
      delete HTMLElement.prototype.offsetParent;
    }
  });

  it('renders nothing when isOpen is false', () => {
    useFaqStore.setState({ isOpen: false });
    render(<FaqModal />);

    expect(screen.queryByTestId('faq-modal')).not.toBeInTheDocument();
  });

  describe('When isOpen is true', () => {
    beforeEach(() => {
      useFaqStore.setState({ isOpen: true, activeTab: 'faq' });
    });

    it('renders dialog overlay with accessibility attributes and header content', () => {
      render(<FaqModal />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'faq-modal-title');

      expect(
        screen.getByRole('heading', { level: 2, name: 'Documentation & Knowledge Base' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Close documentation')).toBeInTheDocument();
    });

    it('locks body scroll on mount and restores on unmount', () => {
      const { unmount } = render(<FaqModal />);

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('');
    });

    it('closes modal when close button is clicked', () => {
      render(<FaqModal />);

      const closeBtn = screen.getByLabelText('Close documentation');
      fireEvent.click(closeBtn);

      expect(useFaqStore.getState().isOpen).toBe(false);
    });

    it('closes modal on backdrop click outside the dialog card', () => {
      render(<FaqModal />);

      const backdrop = screen.getByTestId('faq-modal');
      fireEvent.click(backdrop);

      expect(useFaqStore.getState().isOpen).toBe(false);
    });

    it('does not close modal when clicking inside dialog card content', () => {
      render(<FaqModal />);

      const heading = screen.getByText('Documentation & Knowledge Base');
      fireEvent.click(heading);

      expect(useFaqStore.getState().isOpen).toBe(true);
    });

    it('closes modal when Escape key is pressed', () => {
      render(<FaqModal />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(useFaqStore.getState().isOpen).toBe(false);
    });

    it('switches tabs and fetches corresponding documentation slug', () => {
      render(<FaqModal />);

      expect(useStaticDocModule.useStaticDoc).toHaveBeenCalledWith('faq');

      const releaseHistoryTab = screen.getByRole('tab', { name: /Release History/i });
      fireEvent.click(releaseHistoryTab);

      expect(useFaqStore.getState().activeTab).toBe('history');
    });

    it('updates searchQuery when typing in search input', () => {
      render(<FaqModal />);

      const searchInput = screen.getByRole('searchbox');
      fireEvent.change(searchInput, { target: { value: 'ports' } });

      expect(useFaqStore.getState().searchQuery).toBe('ports');
      expect(searchInput).toHaveValue('ports');
    });

    it('renders clear search button when query is not empty and clears query on click', () => {
      useFaqStore.setState({ searchQuery: 'existing query' });
      render(<FaqModal />);

      const clearBtn = screen.getByLabelText('Clear search');
      expect(clearBtn).toBeInTheDocument();

      fireEvent.click(clearBtn);

      expect(useFaqStore.getState().searchQuery).toBe('');
    });

    it('displays loading spinner when content is loading', () => {
      vi.mocked(useStaticDocModule.useStaticDoc).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as unknown as ReturnType<typeof useStaticDocModule.useStaticDoc>);

      render(<FaqModal />);

      expect(screen.getByText('Loading documentation...')).toBeInTheDocument();
    });

    it('displays error state and calls refetch when Retry is clicked', () => {
      vi.mocked(useStaticDocModule.useStaticDoc).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network timeout'),
        refetch: mockRefetch,
      } as unknown as ReturnType<typeof useStaticDocModule.useStaticDoc>);

      render(<FaqModal />);

      expect(screen.getByText('Documentation Unavailable')).toBeInTheDocument();
      expect(screen.getByText('Network timeout')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: 'Retry' });
      fireEvent.click(retryBtn);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('traps tab focus within dialog elements on Tab and Shift+Tab', () => {
      render(<FaqModal />);

      const dialog = screen.getByTestId('faq-modal');
      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(el => el.offsetParent !== null);

      expect(focusableElements.length).toBeGreaterThan(1);
      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];

      // Tab on last element wraps to first
      lastEl.focus();
      expect(document.activeElement).toBe(lastEl);
      fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
      expect(document.activeElement).toBe(firstEl);

      // Shift+Tab on first element wraps to last
      firstEl.focus();
      expect(document.activeElement).toBe(firstEl);
      fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(lastEl);
    });
  });
});
