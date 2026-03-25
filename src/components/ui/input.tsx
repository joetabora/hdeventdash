import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

const baseInput =
  "w-full px-4 py-2.5 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 transition-all duration-150";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm text-harley-text-muted mb-1.5">
            {label}
          </label>
        )}
        <input ref={ref} className={`${baseInput} ${className}`} {...props} />
        {error && <p className="mt-1 text-xs text-harley-danger">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className = "", ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm text-harley-text-muted mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`${baseInput} min-h-[80px] resize-y ${className}`}
          {...props}
        />
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = "", ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm text-harley-text-muted mb-1.5">
            {label}
          </label>
        )}
        <select ref={ref} className={`${baseInput} ${className}`} {...props}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);
Select.displayName = "Select";
