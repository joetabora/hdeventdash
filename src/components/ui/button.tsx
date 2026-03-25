import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-harley-orange text-white hover:bg-harley-orange-light focus:ring-harley-orange/50",
  secondary:
    "bg-harley-gray text-harley-text hover:bg-harley-gray-light border border-harley-gray-lighter focus:ring-harley-gray-lighter/50",
  ghost:
    "bg-transparent text-harley-text-muted hover:bg-harley-gray hover:text-harley-text focus:ring-harley-gray/50",
  danger:
    "bg-harley-danger text-white hover:bg-harley-danger/80 focus:ring-harley-danger/50",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
