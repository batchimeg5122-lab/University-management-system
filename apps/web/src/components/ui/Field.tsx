import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Field({ label, hint, error, children, className, htmlFor, required }: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  required?: boolean;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-soft">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string; wrapperClassName?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, hint, error, className, wrapperClassName, id, required, ...props }, ref) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  const input = <input ref={ref} id={inputId} required={required} className={cn('field', error && 'border-danger', className)} {...props} />;
  if (!label && !hint && !error) return input;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={wrapperClassName} required={required}>
      {input}
    </Field>
  );
});
Input.displayName = 'Input';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, className, wrapperClassName, options, placeholder, id, required, ...props }, ref) => {
    const autoId = useId();
    const selectId = id ?? autoId;
    const el = (
      <div className={cn('relative', !label && wrapperClassName)}>
        <select ref={ref} id={selectId} required={required} className={cn('field appearance-none pr-8', error && 'border-danger', className)} {...props}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      </div>
    );
    if (!label && !hint && !error) return el;
    return (
      <Field label={label} hint={hint} error={error} htmlFor={selectId} className={wrapperClassName} required={required}>
        {el}
      </Field>
    );
  },
);
Select.displayName = 'Select';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string; wrapperClassName?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, hint, className, wrapperClassName, id, required, ...props }, ref) => {
  const autoId = useId();
  const tid = id ?? autoId;
  return (
    <Field label={label} hint={hint} htmlFor={tid} className={wrapperClassName} required={required}>
      <textarea ref={ref} id={tid} required={required} className={cn('field h-auto min-h-[96px] resize-y py-2 leading-relaxed', className)} {...props} />
    </Field>
  );
});
Textarea.displayName = 'Textarea';
