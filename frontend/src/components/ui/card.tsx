import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge(clsx("bg-white border border-slate-200/80 rounded-2xl shadow-2xs", className))}
      {...props}
    />
  )
);
Card.displayName = "Card";
