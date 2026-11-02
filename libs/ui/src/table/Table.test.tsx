import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './Table';
import { TableBulkActions } from './TableBulkActions';

describe('Table', () => {
  it('renders semantic table structure with caption, header, body, and footer', () => {
    render(
      <Table>
        <TableCaption>Server list</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Server Name</TableHead>
            <TableHead align="right">Players</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>EU-01 Chernarus</TableCell>
            <TableCell align="right">42/60</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell align="right">42</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Server list')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Server Name' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'EU-01 Chernarus' })).toBeInTheDocument();
  });

  it('applies density scaling to table head and cells', () => {
    const { rerender } = render(
      <Table density="comfortable">
        <TableHeader>
          <TableRow>
            <TableHead>Col</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Val</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    let head = screen.getByRole('columnheader');
    let cell = screen.getByRole('cell');
    expect(head).toHaveClass('py-3');
    expect(cell).toHaveClass('py-3');

    rerender(
      <Table density="compact">
        <TableHeader>
          <TableRow>
            <TableHead>Col</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Val</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    head = screen.getByRole('columnheader');
    cell = screen.getByRole('cell');
    expect(head).toHaveClass('py-2');
    expect(cell).toHaveClass('py-2');
  });

  it('supports row selection styling and aria-selected attribute', () => {
    render(
      <Table>
        <TableBody>
          <TableRow isSelected>
            <TableCell>Selected Row</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const row = screen.getByRole('row');
    expect(row).toHaveAttribute('aria-selected', 'true');
    expect(row).toHaveClass('bg-[var(--color-primary)]/5');
  });

  it('supports column sorting states (asc, desc) and click handler', async () => {
    const user = userEvent.setup();
    const handleSort = vi.fn();

    const { rerender } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead sortDirection="asc" onSort={handleSort}>
              Sortable Col
            </TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );

    const head = screen.getByRole('columnheader');
    expect(head).toHaveAttribute('aria-sort', 'ascending');

    await user.click(head);
    expect(handleSort).toHaveBeenCalledTimes(1);

    rerender(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead sortDirection="desc" onSort={handleSort}>
              Sortable Col
            </TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );

    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'descending');
  });

  it('supports keyboard sorting via Enter and Space and includes tabIndex=0 and role="columnheader"', async () => {
    const user = userEvent.setup();
    const handleSort = vi.fn();

    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead sortDirection="asc" onSort={handleSort}>
              Sortable Col
            </TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );

    const head = screen.getByRole('columnheader', { name: /Sortable Col/i });
    expect(head).toHaveAttribute('tabIndex', '0');
    expect(head).toHaveAttribute('role', 'columnheader');

    head.focus();
    expect(head).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(handleSort).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(handleSort).toHaveBeenCalledTimes(2);
  });

  it('renders alignment classes correctly', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead align="center">Center</TableHead>
            <TableHead align="right">Right</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell align="center">C</TableCell>
            <TableCell align="right">R</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole('columnheader', { name: 'Center' })).toHaveClass('text-center');
    expect(screen.getByRole('columnheader', { name: 'Right' })).toHaveClass('text-right');
    expect(screen.getByRole('cell', { name: 'C' })).toHaveClass('text-center');
    expect(screen.getByRole('cell', { name: 'R' })).toHaveClass('text-right');
  });

  it('renders TableEmpty placeholder across colSpan with message and action', () => {
    render(
      <Table>
        <TableBody>
          <TableEmpty
            colSpan={5}
            title="Empty Table Title"
            description="Empty Table Description"
            action={<button type="button">Action Button</button>}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getByText('Empty Table Title')).toBeInTheDocument();
    expect(screen.getByText('Empty Table Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
    expect(screen.getByRole('cell')).toHaveAttribute('colspan', '5');
  });

  it('forwards ref to table and containerRef to outer div', () => {
    const tableRef = createRef<HTMLTableElement>();
    const containerRef = createRef<HTMLDivElement>();

    render(<Table ref={tableRef} containerRef={containerRef} />);

    expect(tableRef.current).toBeInstanceOf(HTMLTableElement);
    expect(containerRef.current).toBeInstanceOf(HTMLDivElement);
  });

  it('supports embedded variant without rounded corners or shadow', () => {
    const containerRef = createRef<HTMLDivElement>();

    const { rerender } = render(<Table variant="standalone" containerRef={containerRef} />);
    expect(containerRef.current).toHaveClass('shadow-[var(--shadow-card)]');
    expect(containerRef.current).toHaveClass('rounded-xl');

    rerender(<Table variant="embedded" containerRef={containerRef} />);

    expect(containerRef.current).toHaveClass('border-y');
    expect(containerRef.current).not.toHaveClass('rounded-xl');
    expect(containerRef.current).not.toHaveClass('shadow-[var(--shadow-card)]');
  });

  it('handles aria-sort="none" for unsorted sortable columns and omits aria-sort for non-sortable columns', () => {
    const handleSort = vi.fn();
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead sortDirection={false} onSort={handleSort}>
              Unsorted Column
            </TableHead>
            <TableHead onSort={handleSort}>Sortable Without Direction</TableHead>
            <TableHead>Non-Sortable Column</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );

    const unsortedCol = screen.getByRole('columnheader', { name: /Unsorted Column/i });
    expect(unsortedCol).toHaveAttribute('aria-sort', 'none');

    const sortableWithoutDir = screen.getByRole('columnheader', {
      name: /Sortable Without Direction/i,
    });
    expect(sortableWithoutDir).toHaveAttribute('aria-sort', 'none');

    const nonSortableCol = screen.getByRole('columnheader', { name: /Non-Sortable Column/i });
    expect(nonSortableCol).not.toHaveAttribute('aria-sort');
  });

  it('configures scrollable table region with role, tabIndex, and default or custom accessible name', () => {
    const { rerender } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    let region = screen.getByRole('region', { name: 'Scrollable table' });
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('tabIndex', '0');

    rerender(
      <Table aria-label="Server activity table">
        <TableBody>
          <TableRow>
            <TableCell>Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    region = screen.getByRole('region', { name: 'Server activity table' });
    expect(region).toBeInTheDocument();
  });
});

describe('TableBulkActions', () => {
  it('does not render when selectedCount is 0 or negative', () => {
    const { container } = render(<TableBulkActions selectedCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders selected count and action buttons when selectedCount > 0', () => {
    render(
      <TableBulkActions selectedCount={3}>
        <button type="button">Bulk Action</button>
      </TableBulkActions>,
    );

    expect(screen.getByRole('region', { name: 'Table bulk actions' })).toBeInTheDocument();
    expect(screen.getByText('3 items selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bulk Action' })).toBeInTheDocument();
  });

  it('invokes onClearSelection callback when clear button is clicked', async () => {
    const user = userEvent.setup();
    const handleClear = vi.fn();

    render(
      <TableBulkActions
        selectedCount={1}
        onClearSelection={handleClear}
        clearLabel="Deselect All"
      />,
    );

    const clearBtn = screen.getByRole('button', { name: 'Deselect All' });
    await user.click(clearBtn);

    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
