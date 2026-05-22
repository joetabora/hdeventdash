import { ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";
/** Sizes allowed on anchor-styled CTAs (`Link` lacks `disabled`, so skip `icon` affordance here). */
type LinkButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-harley-orange-light to-harley-orange-dark text-white shadow-[0_1px_0_rgb(0_0_0/0.15),inset_0_1px_0_rgb(255_255_255/0.12)] hover:from-[#ff9647] hover:to-harley-orange-dark hover:shadow-md hover:shadow-harley-orange/20 active:to-harley-orange-dark active:shadow-inner",
  secondary:
    "bg-surface-overlay/72 text-harley-text border border-border-strong/80 hover:bg-surface-raised hover:border-harley-text-muted/35 active:bg-surface-overlay",
  ghost:
    "bg-transparent text-harley-text-muted hover:bg-surface-raised/60 hover:text-harley-text active:bg-surface-raised",
  danger:
    "bg-transparent text-harley-danger border border-harley-danger/40 hover:bg-harley-danger/10 hover:border-harley-danger/60 active:bg-harley-danger/15",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-base",
  icon: "p-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      type = "button",
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 outline-none ring-offset-transparent focus-visible:ring-2 focus-visible:ring-harley-orange focus-visible:ring-offset-2 focus-visible:ring-offset-harley-black disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
          variantStyles[variant],
          sizeStyles[size],
          "active:scale-[0.98]",
          size !== "icon" && "gap-2",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export const buttonStyles = {
  primary: (size: LinkButtonSize = "md") =>
    cn(
      "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harley-orange focus-visible:ring-offset-2 focus-visible:ring-offset-harley-black",
      variantStyles.primary,
      sizeStyles[size],
      "active:scale-[0.98]"
    ),
  secondary: (size: LinkButtonSize = "md") =>
    cn(
      "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harley-orange focus-visible:ring-offset-2 focus-visible:ring-offset-harley-black",
      variantStyles.secondary,
      sizeStyles[size],
      "active:scale-[0.98]"
    ),
} as const;
