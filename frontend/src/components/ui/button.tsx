import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "danger" | "success" | "gold";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", loading = false, disabled, children, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-bold transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none active:scale-[0.98]";
    const variants = {
      default: "bg-primary hover:bg-primary-hover active:bg-primary-active !text-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]",
      secondary: "bg-secondary hover:bg-secondary-hover !text-white shadow-[var(--shadow-sm)]",
      outline: "border border-border bg-bg-surface hover:bg-bg-sunken text-text-primary hover:text-primary hover:border-border-hover shadow-[var(--shadow-xs)]",
      ghost: "hover:bg-bg-sunken text-text-primary hover:text-primary",
      danger: "bg-danger hover:bg-[#B91C1C] !text-white shadow-[var(--shadow-sm)]",
      success: "bg-success hover:bg-[#15803D] !text-white shadow-[var(--shadow-sm)]",
      gold: "bg-brand-gold hover:bg-brand-gold-hover !text-primary shadow-[var(--shadow-sm)] font-extrabold",
    };
    const sizes = {
      sm: "px-2.5 py-1.5 text-[var(--font-size-caption)] rounded-[var(--radius-md)] gap-1",
      md: "px-4 py-2 text-[var(--font-size-caption)] rounded-[var(--radius-lg)] gap-1.5",
      lg: "px-5 py-2.5 text-[var(--font-size-body)] rounded-[var(--radius-lg)] gap-2",
      icon: "p-2 rounded-[var(--radius-md)]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={twMerge(clsx(base, variants[variant], sizes[size], className))}
        {...props}
      >
        {loading ? (
          <>
            <svg className="w-3.5 h-3.5 cfx-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            {children}
          </>
        ) : children}
      </button>
    );
  }
);
Button.displayName = "Button";
