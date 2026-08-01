import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={twMerge(
        clsx(
          "flex h-9 w-full rounded-[var(--radius-lg)] border border-border bg-bg-surface px-3 py-1 text-[var(--font-size-body)] text-text-primary shadow-[var(--shadow-xs)] transition-all duration-[var(--duration-normal)] placeholder:text-text-muted focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-border-focus disabled:cursor-not-allowed disabled:opacity-50",
          className
        )
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
