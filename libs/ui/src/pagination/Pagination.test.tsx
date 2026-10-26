import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { getPaginationItems, Pagination } from './';

describe('getPaginationItems', () => {
  it('returns empty array when totalPages <= 0', () => {
    expect(getPaginationItems(1, 0)).toEqual([]);
    expect(getPaginationItems(1, -5)).toEqual([]);
  });

  it('returns all page numbers when totalPages is less than or equal to total visible threshold', () => {
    expect(getPaginationItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPaginationItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('handles near-start pagination with right ellipsis', () => {
    const items = getPaginationItems(2, 10, 1);
    expect(items).toEqual([1, 2, 3, 4, 5, 'ellipsis-right', 10]);
  });

  it('handles middle pagination with both left and right ellipses', () => {
    const items = getPaginationItems(5, 10, 1);
    expect(items).toEqual([1, 'ellipsis-left', 4, 5, 6, 'ellipsis-right', 10]);
  });

  it('handles near-end pagination with left ellipsis', () => {
    const items = getPaginationItems(9, 10, 1);
    expect(items).toEqual([1, 'ellipsis-left', 6, 7, 8, 9, 10]);
  });
});

describe('Pagination Component', () => {
  it('renders item range summary and navigates through pages', async () => {
    const user = userEvent.setup();
    const handlePageChange = vi.fn();

    render(
      <Pagination
        page={2}
        totalPages={10}
        totalItems={250}
        pageSize={25}
        onPageChange={handlePageChange}
      />,
    );

    expect(screen.getByText('Showing 26 to 50 of 250 items')).toBeInTheDocument();

    const page3Button = screen.getByRole('button', { name: 'Page 3' });
    await user.click(page3Button);
    expect(handlePageChange).toHaveBeenCalledWith(3);

    const nextButton = screen.getByRole('button', { name: 'Go to next page' });
    await user.click(nextButton);
    expect(handlePageChange).toHaveBeenCalledWith(3); // page 2 + 1
  });

  it('supports custom formatItemCount render function', () => {
    render(
      <Pagination
        page={1}
        totalPages={5}
        totalItems={100}
        pageSize={20}
        onPageChange={vi.fn()}
        formatItemCount={(from, to, total) => `Items ${from}-${to} (total ${total})`}
      />,
    );

    expect(screen.getByText('Items 1-20 (total 100)')).toBeInTheDocument();
  });

  it('renders active page with aria-current="page"', () => {
    render(<Pagination page={4} totalPages={10} onPageChange={vi.fn()} />);

    const activePageButton = screen.getByRole('button', { name: 'Page 4' });
    expect(activePageButton).toHaveAttribute('aria-current', 'page');

    const inactivePageButton = screen.getByRole('button', { name: 'Page 5' });
    expect(inactivePageButton).not.toHaveAttribute('aria-current');
  });

  it('disables previous button on first page and next button on last page', () => {
    const { rerender } = render(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} />);

    const prevButton = screen.getByRole('button', { name: 'Go to previous page' });
    const nextButton = screen.getByRole('button', { name: 'Go to next page' });

    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    rerender(<Pagination page={5} totalPages={5} onPageChange={vi.fn()} />);

    expect(prevButton).not.toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it('handles rows-per-page selection changes', async () => {
    const user = userEvent.setup();
    const handlePageSizeChange = vi.fn();

    render(
      <Pagination
        page={1}
        totalPages={10}
        pageSize={25}
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={vi.fn()}
        onPageSizeChange={handlePageSizeChange}
      />,
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('25');

    await user.selectOptions(select, '50');
    expect(handlePageSizeChange).toHaveBeenCalledWith(50);
  });

  it('supports quick first and last page buttons when showFirstLast is true', async () => {
    const user = userEvent.setup();
    const handlePageChange = vi.fn();

    render(<Pagination page={5} totalPages={10} showFirstLast onPageChange={handlePageChange} />);

    const firstButton = screen.getByRole('button', { name: 'Go to first page' });
    const lastButton = screen.getByRole('button', { name: 'Go to last page' });

    expect(firstButton).toBeInTheDocument();
    expect(lastButton).toBeInTheDocument();

    await user.click(firstButton);
    expect(handlePageChange).toHaveBeenCalledWith(1);

    await user.click(lastButton);
    expect(handlePageChange).toHaveBeenCalledWith(10);
  });

  it('disables all interactive elements when disabled prop is true', () => {
    render(
      <Pagination
        page={3}
        totalPages={10}
        totalItems={100}
        pageSize={10}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        showFirstLast
        disabled
      />,
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go to first page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Page 3' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Page 4' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go to last page' })).toBeDisabled();
  });

  it('forwards ref to root nav element', () => {
    const navRef = createRef<HTMLElement>();

    render(<Pagination ref={navRef} page={1} totalPages={5} onPageChange={vi.fn()} />);

    expect(navRef.current).toBeInstanceOf(HTMLElement);
    expect(navRef.current?.tagName.toLowerCase()).toBe('nav');
    expect(navRef.current).toHaveAttribute('aria-label', 'Pagination');
  });
});
