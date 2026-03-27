import type { SelectHTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn("select", className)}
    />
  );
}
