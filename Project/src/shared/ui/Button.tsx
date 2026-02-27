import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "danger" };

export function Button({ variant = "primary", ...props }: Props) {
  return (
    <button
      {...props}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #333",
        background: variant === "danger" ? "#ffdddd" : "#e9e9ff",
        cursor: "pointer"
      }}
    />
  );
}