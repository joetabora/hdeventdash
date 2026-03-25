import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-harley-orange text-white hover:bg-harley-orange-light active:bg-harley-orange-dark",
  secondary:
    "bg-harley-gray-light/60 text-harley-text hover:bg-harley-gray-light border border-harley-gray-lighter/60 active:bg-harley-gray-lighter/40",
  ghost:
    "bg-transparent text-harley-text-muted hover:bg-harley-gray-light/50 hover:text-harley-text active:bg-harley-gray-light",
  danger:
    "bg-harley-danger/90 text-white hover:bg-harley-danger active:bg-harley-danger/80",
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
        className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
