import { forwardRef, HTMLAttributes } from "react";

type CardPadding = "none" | "sm" | "md" | "lg" | "xl";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  hover?: boolean;
  interactive?: boolean;
}

const paddingStyles: Record<CardPadding, string> = {
  none: "",
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
        className={`bg-harley-dark rounded-xl border border-harley-gray shadow-sm ${
          paddingStyles[padding]
        } ${
          hover
            ? "hover:border-harley-orange/40 hover:shadow-md hover:shadow-harley-orange/5 transition-all duration-200"
            : ""
        } ${interactive ? "cursor-pointer" : ""} ${className}`}
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
