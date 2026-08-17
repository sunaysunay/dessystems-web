import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider, useToast } from '@/components/Toast';

function TestHarness() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success('Saved')}>fire-success</button>
      <button onClick={() => toast.error('Failed', 'Something broke')}>fire-error</button>
      <button onClick={() => toast.warning('Caution')}>fire-warning</button>
      <button onClick={() => toast.info('Note')}>fire-info</button>
      <button onClick={() => toast.addToast({ variant: 'info', title: 'Sticky', duration: 0 })}>fire-sticky</button>
      <button onClick={() => toast.addToast({
        variant: 'success', title: 'Action', action: { label: 'Undo', onClick: () => {} },
      })}>fire-action</button>
    </div>
  );
}

function setup() {
  return render(
    <ToastProvider>
      <TestHarness />
    </ToastProvider>,
  );
}

describe('Toast', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('shows success toast', () => {
    setup();
    fireEvent.click(screen.getByText('fire-success'));
    expect(screen.getByText('Saved')).toBeTruthy();
  });

  it('shows error toast with message', () => {
    setup();
    fireEvent.click(screen.getByText('fire-error'));
    expect(screen.getByText('Failed')).toBeTruthy();
    expect(screen.getByText('Something broke')).toBeTruthy();
  });

  it('shows warning toast', () => {
    setup();
    fireEvent.click(screen.getByText('fire-warning'));
    expect(screen.getByText('Caution')).toBeTruthy();
  });

  it('shows info toast', () => {
    setup();
    fireEvent.click(screen.getByText('fire-info'));
    expect(screen.getByText('Note')).toBeTruthy();
  });

  it('auto-dismisses after duration', () => {
    setup();
    fireEvent.click(screen.getByText('fire-success'));
    expect(screen.getByText('Saved')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(4200); });
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('sticky toast does not auto-dismiss', () => {
    setup();
    fireEvent.click(screen.getByText('fire-sticky'));
    expect(screen.getByText('Sticky')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(10000); });
    expect(screen.getByText('Sticky')).toBeTruthy();
  });

  it('renders action button', () => {
    setup();
    fireEvent.click(screen.getByText('fire-action'));
    expect(screen.getByText('Undo')).toBeTruthy();
  });

  it('dismiss button removes toast', () => {
    setup();
    fireEvent.click(screen.getByText('fire-sticky'));
    expect(screen.getByText('Sticky')).toBeTruthy();
    const closeButtons = screen.getAllByRole('button').filter(
      b => b.querySelector('svg'),
    );
    const dismissBtn = closeButtons[closeButtons.length - 1];
    fireEvent.click(dismissBtn);
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.queryByText('Sticky')).toBeNull();
  });

  it('throws when useToast is used outside provider', () => {
    function Bad() { useToast(); return null; }
    expect(() => render(<Bad />)).toThrow('useToast must be inside ToastProvider');
  });
});
