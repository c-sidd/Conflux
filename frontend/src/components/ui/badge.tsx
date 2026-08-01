import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "outline" | "gold";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-primary-light text-primary border-primary/20",
    secondary: "bg-bg-sunken text-text-secondary border-border",
    success: "bg-success-light text-success border-success/20",
    warning: "bg-warning-light text-warning border-warning/20",
    danger: "bg-danger-light text-danger border-danger/20",
    outline: "bg-transparent text-text-secondary border-border",
    gold: "bg-brand-gold-light text-[#92780A] border-brand-gold/30",
  };

  return (
    <div
      className={twMerge(
        clsx(
          "inline-flex items-center rounded-[var(--radius-full)] border px-2.5 py-0.5 text-[var(--font-size-label)] font-bold tracking-wider uppercase transition-colors duration-[var(--duration-fast)]",
          variants[variant],
          className
        )
      )}
      {...props}
    />
  );
}
