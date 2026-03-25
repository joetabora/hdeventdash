import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-harley-orange text-white shadow-sm shadow-harley-orange/20 hover:bg-harley-orange-light hover:shadow-md hover:shadow-harley-orange/25 active:bg-harley-orange-dark active:shadow-none",
  secondary:
    "bg-transparent text-harley-text border border-harley-gray-lighter/60 hover:border-harley-text-muted/40 hover:bg-harley-gray-light/30 active:bg-harley-gray-light/50 active:border-harley-text-muted/50",
  ghost:
    "bg-transparent text-harley-text-muted hover:bg-harley-gray-light/50 hover:text-harley-text active:bg-harley-gray-light",
  danger:
    "bg-transparent text-harley-danger border border-harley-danger/40 hover:bg-harley-danger/10 hover:border-harley-danger/60 active:bg-harley-danger/15",
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
        className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export const buttonStyles = {
  primary: (size: Size = "md") =>
    `inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 ${variantStyles.primary} ${sizeStyles[size]}`,
  secondary: (size: Size = "md") =>
    `inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 ${variantStyles.secondary} ${sizeStyles[size]}`,
} as const;
