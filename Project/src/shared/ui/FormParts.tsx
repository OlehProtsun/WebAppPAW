import type { FormHTMLAttributes, ReactNode } from "react";
import { cn } from "@shared/lib/cn";

type FormSurface = "card" | "plain";

type FormShellProps = FormHTMLAttributes<HTMLFormElement> & {
  surface?: FormSurface;
};

type FormHeadingProps = {
  title: string;
  description: string;
};

type FormFieldProps = {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
};

type FormErrorProps = {
  message: string | null;
};

export function FormShell({
  children,
  className,
  surface = "card",
  ...props
}: FormShellProps) {
  return (
    <form
      {...props}
      className={cn(surface === "card" ? "card stack gap-3" : "grid gap-3 p-1", className)}
    >
      {children}
    </form>
  );
}

export function FormHeading({ title, description }: FormHeadingProps) {
  return (
    <div className="grid gap-1">
      <div className="text-[20px] font-extrabold">{title}</div>
      <div className="muted text-[13px]">{description}</div>
    </div>
  );
}

export function FormField({ label, children, hint, className }: FormFieldProps) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <div className="font-bold">{label}</div>
      {children}
      {hint ? <div className="muted text-[12px]">{hint}</div> : null}
    </label>
  );
}

export function FormError({ message }: FormErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="card rounded-[20px] border-[color:rgba(255,59,48,0.35)] bg-[rgba(255,59,48,0.06)] p-3.5">
      <div className="font-extrabold">Error</div>
      <div className="muted mt-1">{message}</div>
    </div>
  );
}
