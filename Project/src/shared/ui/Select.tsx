import type { SelectHTMLAttributes } from "react";

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={["select", className].filter(Boolean).join(" ")}
    />
  );
}
