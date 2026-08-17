import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FormField, {
  useFormState, FormSection, FormActions, validators,
} from '@/components/FormField';
import { renderHook, act } from '@testing-library/react';

describe('FormField', () => {
  const onChange = vi.fn();

  afterEach(() => onChange.mockClear());

  it('renders text input with label', () => {
    render(<FormField name="title" label="Title" value="" onChange={onChange} />);
    expect(screen.getByLabelText(/Title/)).toBeTruthy();
  });

  it('calls onChange with name and value', () => {
    render(<FormField name="title" label="Title" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('title', 'hello');
  });

  it('renders select with options', () => {
    render(
      <FormField
        name="status"
        label="Status"
        type="select"
        value="active"
        onChange={onChange}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'draft', label: 'Draft' },
        ]}
      />,
    );
    const select = screen.getByLabelText(/Status/) as HTMLSelectElement;
    expect(select.value).toBe('active');
  });

  it('renders textarea', () => {
    render(<FormField name="notes" label="Notes" type="textarea" value="hi" onChange={onChange} />);
    expect(screen.getByLabelText(/Notes/).tagName).toBe('TEXTAREA');
  });

  it('renders checkbox', () => {
    render(<FormField name="agree" label="Agree" type="checkbox" value={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith('agree', true);
  });

  it('renders toggle switch', () => {
    render(<FormField name="enabled" label="Enabled" type="toggle" value={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith('enabled', true);
  });

  it('renders radio options', () => {
    render(
      <FormField
        name="priority"
        label="Priority"
        type="radio"
        value="high"
        onChange={onChange}
        options={[
          { value: 'low', label: 'Low' },
          { value: 'high', label: 'High' },
        ]}
      />,
    );
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect((radios[1] as HTMLInputElement).checked).toBe(true);
  });

  it('shows error message', () => {
    render(<FormField name="x" label="X" value="" onChange={onChange} error="Required" />);
    expect(screen.getByText('Required')).toBeTruthy();
  });

  it('shows hint when no error', () => {
    render(<FormField name="x" label="X" value="" onChange={onChange} hint="Enter a value" />);
    expect(screen.getByText('Enter a value')).toBeTruthy();
  });

  it('shows required asterisk', () => {
    render(<FormField name="x" label="X" value="" onChange={onChange} required />);
    expect(screen.getByText('*')).toBeTruthy();
  });

  it('converts number type to Number', () => {
    render(<FormField name="qty" label="Qty" type="number" value={0} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Qty/), { target: { value: '42' } });
    expect(onChange).toHaveBeenCalledWith('qty', 42);
  });
});

describe('useFormState', () => {
  it('tracks values and dirty state', () => {
    const { result } = renderHook(() =>
      useFormState({ name: '', age: 0 }),
    );
    expect(result.current.dirty).toBe(false);
    act(() => result.current.setField('name', 'Alice'));
    expect(result.current.values.name).toBe('Alice');
    expect(result.current.dirty).toBe(true);
  });

  it('validates all fields', () => {
    const { result } = renderHook(() =>
      useFormState(
        { name: '' },
        { name: validators.required('Name') },
      ),
    );
    let valid: boolean;
    act(() => { valid = result.current.validateAll(); });
    expect(valid!).toBe(false);
    expect(result.current.errors.name).toBe('Name is required');
  });

  it('resets to initial values', () => {
    const { result } = renderHook(() => useFormState({ x: 'a' }));
    act(() => result.current.setField('x', 'b'));
    act(() => result.current.reset());
    expect(result.current.values.x).toBe('a');
    expect(result.current.dirty).toBe(false);
  });
});

describe('FormSection', () => {
  it('renders title and children', () => {
    render(<FormSection title="Details"><span>child</span></FormSection>);
    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getByText('child')).toBeTruthy();
  });
});

describe('FormActions', () => {
  it('renders children', () => {
    render(<FormActions><button>Save</button></FormActions>);
    expect(screen.getByText('Save')).toBeTruthy();
  });
});

describe('validators', () => {
  it('required returns error for empty string', () => {
    expect(validators.required('X')('')).toBe('X is required');
    expect(validators.required('X')('hi')).toBeUndefined();
  });

  it('email validates format', () => {
    expect(validators.email('bad')).toBeTruthy();
    expect(validators.email('a@b.c')).toBeUndefined();
  });

  it('compose chains validators', () => {
    const v = validators.compose(validators.required('X'), validators.minLength('X', 3));
    expect(v('')).toBe('X is required');
    expect(v('ab')).toBe('X must be at least 3 characters');
    expect(v('abc')).toBeUndefined();
  });
});
