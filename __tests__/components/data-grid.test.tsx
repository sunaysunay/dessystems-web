import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

type Row = { id: string; name: string; status: string; amount: number };

const ROWS: Row[] = [
  { id: '1', name: 'Alpha', status: 'active', amount: 100 },
  { id: '2', name: 'Beta',  status: 'draft',  amount: 250 },
  { id: '3', name: 'Gamma', status: 'active', amount: 50 },
  { id: '4', name: 'Delta', status: 'blocked', amount: 300 },
];

const COLS: Column<Row>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
  { key: 'amount', header: 'Amount', sortable: true, align: 'right' },
];

function grid(props?: Partial<React.ComponentProps<typeof DataGrid<Row>>>) {
  return render(
    <DataGrid
      columns={COLS}
      rows={ROWS}
      rowKey={r => r.id}
      pageSize={25}
      {...props}
    />
  );
}

describe('DataGrid', () => {
  it('renders all rows', () => {
    grid();
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.getByText('Gamma')).toBeTruthy();
    expect(screen.getByText('Delta')).toBeTruthy();
  });

  it('renders column headers', () => {
    grid();
    expect(screen.getByText(/Name/)).toBeTruthy();
    expect(screen.getByText(/Status/)).toBeTruthy();
    expect(screen.getByText(/Amount/)).toBeTruthy();
  });

  it('shows loading state', () => {
    grid({ loading: true });
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('shows empty message', () => {
    grid({ rows: [], emptyMessage: 'Nothing here' });
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('filters rows by search', () => {
    grid();
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.change(input, { target: { value: 'alpha' } });
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.queryByText('Beta')).toBeNull();
  });

  it('sorts by column ascending then descending', () => {
    grid();
    const nameBtn = screen.getByRole('button', { name: /Name/ });
    fireEvent.click(nameBtn);
    const cells = screen.getAllByRole('row').slice(1); // skip header
    expect(cells[0].textContent).toContain('Alpha');
    expect(cells[3].textContent).toContain('Gamma');

    // Click again → descending
    fireEvent.click(nameBtn);
    const cells2 = screen.getAllByRole('row').slice(1);
    expect(cells2[0].textContent).toContain('Gamma');
  });

  it('paginates when rows exceed pageSize', () => {
    const manyRows = Array.from({ length: 30 }, (_, i) => ({
      id: String(i), name: `Item ${i}`, status: 'active', amount: i,
    }));
    grid({ rows: manyRows, pageSize: 10 });
    expect(screen.getByText('1–10 of 30')).toBeTruthy();
    fireEvent.click(screen.getByText('Next →'));
    expect(screen.getByText('11–20 of 30')).toBeTruthy();
    fireEvent.click(screen.getByText('← Prev'));
    expect(screen.getByText('1–10 of 30')).toBeTruthy();
  });

  it('supports row selection', () => {
    const onSelect = vi.fn();
    grid({ selectable: true, onSelectionChange: onSelect });
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is "select all", rest are per-row
    expect(checkboxes).toHaveLength(5);
    fireEvent.click(checkboxes[1]); // select first row
    expect(onSelect).toHaveBeenCalledWith(new Set(['1']));
  });

  it('select-all toggles all visible rows', () => {
    const onSelect = vi.fn();
    grid({ selectable: true, onSelectionChange: onSelect });
    const selectAll = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAll);
    expect(onSelect).toHaveBeenCalledWith(new Set(['1', '2', '3', '4']));
  });

  it('calls onRowClick', () => {
    const onClick = vi.fn();
    grid({ onRowClick: onClick });
    fireEvent.click(screen.getByText('Alpha'));
    expect(onClick).toHaveBeenCalledWith(ROWS[0]);
  });
});

describe('StatusBadge', () => {
  it('renders status text', () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText('in progress')).toBeTruthy();
  });

  it('uses custom label', () => {
    render(<StatusBadge status="active" label="Live" />);
    expect(screen.getByText('Live')).toBeTruthy();
  });
});
