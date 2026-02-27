import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "danger" };

export function Button({ variant = "primary", className, ...props }: Props) {
  const v = variant === "danger" ? "btn btn-danger" : "btn";
  return <button {...props} className={[v, className].filter(Boolean).join(" ")} />;
}