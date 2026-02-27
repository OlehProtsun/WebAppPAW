import { TextareaHTMLAttributes } from "react";

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #333" }}
    />
  );
}