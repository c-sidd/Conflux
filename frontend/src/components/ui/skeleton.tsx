import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(clsx("rounded-[var(--radius-lg)] cfx-shimmer", className))}
      {...props}
    />
  );
}
