'use client';
import {
  useState, useCallback, useRef, useId,
  type ReactNode, type ChangeEvent, type FocusEvent,
} from 'react';

// ── Types ───────────────────────────────────────────────────────────────────

export type FieldType =
  | 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  | 'date' | 'datetime-local' | 'time'
  | 'textarea' | 'select' | 'checkbox' | 'toggle' | 'radio';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormFieldProps {
  name: string;
  label: string;
  type?: FieldType;
  value: string | number | boolean;
  onChange: (name: string, value: string | number | boolean) => void;

  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;

  // select / radio
  options?: SelectOption[];

  // textarea
  rows?: number;

  // number
  min?: number;
  max?: number;
  step?: number;

  // layout
  className?: string;
  labelClassName?: string;
  inputClassName?: string;

  // validation
  validate?: (value: string | number | boolean) => string | undefined;

  // prefix/suffix
  prefix?: ReactNode;
  suffix?: ReactNode;
}

// ── Shared styles ───────────────────────────────────────────────────────────

const BASE_INPUT =
  'w-full rounded-lg border px-3 py-2 text-sm transition-colors ' +
  'bg-white dark:bg-slate-800 ' +
  'placeholder:text-slate-400 dark:placeholder:text-slate-500 ' +
  'focus:outline-none focus:ring-2';

const BORDER_NORMAL =
  'border-slate-200 dark:border-slate-700 ' +
  'focus:border-indigo-400 focus:ring-indigo-300/40 dark:focus:border-indigo-500 dark:focus:ring-indigo-700/40';

const BORDER_ERROR =
  'border-red-400 dark:border-red-500 ' +
  'focus:border-red-400 focus:ring-red-300/40 dark:focus:ring-red-700/40';

const LABEL_CLS =
  'block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1';

// ── Component ───────────────────────────────────────────────────────────────

export default function FormField({
  name, label, type = 'text', value, onChange,
  placeholder, hint, error: externalError, required, disabled, readOnly, autoFocus,
  options, rows = 3, min, max, step,
  className, labelClassName, inputClassName,
  validate, prefix, suffix,
}: FormFieldProps) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState<string>();

  const error = externalError ?? (touched ? internalError : undefined);

  const handleBlur = useCallback(() => {
    setTouched(true);
    if (validate) {
      setInternalError(validate(value));
    }
  }, [validate, value]);

  const handleChange = useCallback((
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const target = e.target;
    let v: string | number | boolean;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      v = target.checked;
    } else if (type === 'number') {
      v = target.value === '' ? '' : Number(target.value);
    } else {
      v = target.value;
    }
    onChange(name, v);
    if (touched && validate) {
      setInternalError(validate(v));
    }
  }, [name, onChange, type, touched, validate]);

  const borderCls = error ? BORDER_ERROR : BORDER_NORMAL;
  const inputCls = `${BASE_INPUT} ${borderCls} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${inputClassName ?? ''}`;

  // ── Checkbox / Toggle ─────────────────────────────────────────────────────

  if (type === 'checkbox' || type === 'toggle') {
    return (
      <div className={`flex items-start gap-3 ${className ?? ''}`}>
        {type === 'toggle' ? (
          <button
            type="button"
            role="switch"
            aria-checked={!!value}
            disabled={disabled}
            onClick={() => onChange(name, !value)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              value ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
              value ? 'translate-x-[18px]' : 'translate-x-[3px]'
            }`} />
          </button>
        ) : (
          <input
            id={id}
            type="checkbox"
            checked={!!value}
            disabled={disabled}
            onChange={handleChange}
            className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-300 dark:focus:ring-indigo-700"
          />
        )}
        <div>
          <label htmlFor={id} className={`text-sm font-medium text-slate-700 dark:text-slate-200 ${labelClassName ?? ''}`}>
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
          {hint && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
          {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
        </div>
      </div>
    );
  }

  // ── Radio ─────────────────────────────────────────────────────────────────

  if (type === 'radio') {
    return (
      <fieldset className={className}>
        <legend className={labelClassName ?? LABEL_CLS}>
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </legend>
        <div className="mt-1 space-y-1.5">
          {options?.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={value === opt.value}
                disabled={disabled || opt.disabled}
                onChange={handleChange}
                className="text-indigo-600 focus:ring-indigo-300 dark:focus:ring-indigo-700"
              />
              {opt.label}
            </label>
          ))}
        </div>
        {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </fieldset>
    );
  }

  // ── Standard field ────────────────────────────────────────────────────────

  const inputEl = type === 'textarea' ? (
    <textarea
      id={id}
      name={name}
      value={String(value)}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      autoFocus={autoFocus}
      rows={rows}
      className={inputCls}
    />
  ) : type === 'select' ? (
    <select
      id={id}
      name={name}
      value={String(value)}
      onChange={handleChange}
      onBlur={handleBlur}
      required={required}
      disabled={disabled}
      className={inputCls}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options?.map(opt => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  ) : (
    <input
      id={id}
      type={type}
      name={name}
      value={type === 'number' ? (value as number) : String(value)}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      autoFocus={autoFocus}
      min={min}
      max={max}
      step={step}
      className={inputCls}
    />
  );

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClassName ?? LABEL_CLS}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {prefix || suffix ? (
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-slate-400 dark:text-slate-500 text-sm pointer-events-none">
              {prefix}
            </span>
          )}
          <div className={`w-full ${prefix ? '[&>*]:pl-8' : ''} ${suffix ? '[&>*]:pr-8' : ''}`}>
            {inputEl}
          </div>
          {suffix && (
            <span className="absolute right-3 text-slate-400 dark:text-slate-500 text-sm pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
      ) : inputEl}
      {hint && !error && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── useFormState hook ────────────────────────────────────────────────────────

type FormValues = Record<string, string | number | boolean>;
type FormErrors = Record<string, string | undefined>;
type Validators = Record<string, (value: string | number | boolean) => string | undefined>;

export function useFormState<T extends FormValues>(
  initialValues: T,
  validators?: Validators,
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [dirty, setDirty] = useState(false);
  const initialRef = useRef(initialValues);

  const setField = useCallback((name: string, value: string | number | boolean) => {
    setValues(prev => ({ ...prev, [name]: value }));
    setDirty(true);
    if (validators?.[name]) {
      setErrors(prev => ({ ...prev, [name]: validators[name](value) }));
    }
  }, [validators]);

  const validateAll = useCallback((): boolean => {
    if (!validators) return true;
    const next: FormErrors = {};
    let valid = true;
    for (const [key, validate] of Object.entries(validators)) {
      const err = validate(values[key]);
      if (err) { next[key] = err; valid = false; }
    }
    setErrors(next);
    return valid;
  }, [validators, values]);

  const reset = useCallback((newValues?: T) => {
    const v = newValues ?? initialRef.current;
    setValues(v);
    setErrors({});
    setDirty(false);
    if (newValues) initialRef.current = newValues;
  }, []);

  return { values, errors, dirty, setField, validateAll, reset, setValues, setErrors };
}

// ── FormSection layout helper ───────────────────────────────────────────────

export function FormSection({ title, children, columns = 2 }: {
  title?: string;
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  const gridCls = columns === 1
    ? 'grid grid-cols-1 gap-4'
    : columns === 3
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
      : 'grid grid-cols-1 sm:grid-cols-2 gap-4';

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
          {title}
        </h3>
      )}
      <div className={gridCls}>{children}</div>
    </div>
  );
}

// ── FormActions bar ─────────────────────────────────────────────────────────

export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 ${className ?? ''}`}>
      {children}
    </div>
  );
}

// ── Common validators ───────────────────────────────────────────────────────

export const validators = {
  required: (label: string) => (v: string | number | boolean) =>
    (!v && v !== 0 && v !== false) ? `${label} is required` : undefined,

  minLength: (label: string, min: number) => (v: string | number | boolean) =>
    typeof v === 'string' && v.length < min ? `${label} must be at least ${min} characters` : undefined,

  maxLength: (label: string, max: number) => (v: string | number | boolean) =>
    typeof v === 'string' && v.length > max ? `${label} must be at most ${max} characters` : undefined,

  email: (v: string | number | boolean) =>
    typeof v === 'string' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email address' : undefined,

  numeric: (v: string | number | boolean) =>
    typeof v === 'string' && v && isNaN(Number(v)) ? 'Must be a number' : undefined,

  compose: (...fns: Array<(v: string | number | boolean) => string | undefined>) =>
    (v: string | number | boolean) => {
      for (const fn of fns) {
        const err = fn(v);
        if (err) return err;
      }
      return undefined;
    },
};
