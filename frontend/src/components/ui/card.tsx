import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge(clsx(
        "bg-bg-surface border border-border rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)]",
        className
      ))}
      {...props}
    />
  )
);
Card.displayName = "Card";
