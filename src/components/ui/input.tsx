import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef, useId } from "react";

const baseInput =
  "w-full px-4 py-2.5 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 transition-all duration-150";

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
          <label htmlFor={id} className="block text-sm text-harley-text-muted mb-1.5">
            {label}
          </label>
        )}
        <input ref={ref} id={id} className={`${baseInput} ${className}`} {...props} />
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
          <label htmlFor={id} className="block text-sm text-harley-text-muted mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={`${baseInput} min-h-[80px] resize-y ${className}`}
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
          <label htmlFor={id} className="block text-sm text-harley-text-muted mb-1.5">
            {label}
          </label>
        )}
        <select ref={ref} id={id} className={`${baseInput} ${className}`} {...props}>
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
