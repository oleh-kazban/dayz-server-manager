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

    render(<Table variant="embedded" containerRef={containerRef} />);

    expect(containerRef.current).toHaveClass('border-y');
    expect(containerRef.current).not.toHaveClass('rounded-xl');
    expect(containerRef.current).not.toHaveClass('shadow-xs');
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
