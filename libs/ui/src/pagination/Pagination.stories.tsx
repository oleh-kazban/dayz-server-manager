import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Pagination } from './Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'Navigation/Pagination',
  component: Pagination,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  render: () => {
    const [page, setPage] = useState(1);

    return (
      <div className="w-full max-w-xl">
        <Pagination page={page} totalPages={10} onPageChange={setPage} />
      </div>
    );
  },
};

export const FullEnterpriseFooter: Story = {
  render: () => {
    const [page, setPage] = useState(3);
    const [pageSize, setPageSize] = useState(25);
    const totalItems = 348;
    const totalPages = Math.ceil(totalItems / pageSize);

    return (
      <div className="w-full max-w-4xl p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageChange={setPage}
          onPageSizeChange={newSize => {
            setPageSize(newSize);
            setPage(1);
          }}
          showFirstLast
        />
      </div>
    );
  },
};

export const CustomItemCountFormat: Story = {
  render: () => {
    const [page, setPage] = useState(1);

    return (
      <div className="w-full max-w-3xl">
        <Pagination
          page={page}
          totalPages={8}
          totalItems={80}
          pageSize={10}
          onPageChange={setPage}
          formatItemCount={(from, to, total) => (
            <span className="font-mono text-xs">
              Records:{' '}
              <strong className="text-[var(--color-text-main)]">
                {from}–{to}
              </strong>{' '}
              of {total}
            </span>
          )}
        />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="w-full max-w-3xl">
      <Pagination
        page={4}
        totalPages={10}
        totalItems={250}
        pageSize={25}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
        showFirstLast
        disabled
      />
    </div>
  ),
};
