import {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
  useId,
} from "react";

import { cn } from "@/lib/cn";

export const baseInputClassName = cn(
  "w-full rounded-lg border border-border-strong/60 bg-surface-base/50 px-4 py-2.5 text-harley-text",
  "placeholder:text-harley-text-muted/55",
  "transition-[border-color,box-shadow,background-color] duration-150",
  "focus:outline-none focus:border-harley-orange/55 focus:ring-2 focus:ring-harley-orange/18 focus:bg-surface-raised/50"
);

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id: externalId, ...props }, ref) => {
    const autoId = useId();
    const id = externalId ?? (label ? autoId : undefined);
    return (
      <div>
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-sm text-harley-text-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(baseInputClassName, className)}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-harley-danger">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id: externalId, ...props }, ref) => {
    const autoId = useId();
    const id = externalId ?? (label ? autoId : undefined);
    return (
      <div>
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-sm text-harley-text-muted">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(baseInputClassName, "min-h-[80px] resize-y", className)}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-harley-danger">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", id: externalId, ...props }, ref) => {
    const autoId = useId();
    const id = externalId ?? (label ? autoId : undefined);
    return (
      <div>
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-sm text-harley-text-muted">
            {label}
          </label>
        )}
        <select ref={ref} id={id} className={cn(baseInputClassName, className)} {...props}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-harley-danger">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
