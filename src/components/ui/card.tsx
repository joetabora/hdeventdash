import { forwardRef, HTMLAttributes } from "react";

type CardPadding = "none" | "xs" | "sm" | "md" | "lg" | "xl";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  hover?: boolean;
  interactive?: boolean;
}

const paddingStyles: Record<CardPadding, string> = {
  none: "",
  xs: "p-3.5",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
  xl: "p-8",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { padding = "md", hover = false, interactive = false, className = "", children, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`bg-harley-dark rounded-xl border border-harley-gray shadow-[var(--shadow-card)] transition-all duration-200 ${
          paddingStyles[padding]
        } ${
          hover
            ? "hover:border-harley-gray-lighter/50 hover:shadow-[var(--shadow-elevated)] hover:-translate-y-[1px]"
            : ""
        } ${interactive ? "cursor-pointer active:scale-[0.99] active:translate-y-0" : ""} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export function CardHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`pb-4 border-b border-harley-gray mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`font-semibold text-harley-text ${className}`}>
      {children}
    </h3>
  );
}
