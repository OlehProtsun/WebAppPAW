import type { ReactNode } from "react";
import { cn } from "@shared/lib/cn";

type LoadingCardProps = {
  text: string;
  className?: string;
};

type ErrorCardProps = {
  title: string;
  description?: string;
  className?: string;
};

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
  centered?: boolean;
};

export function LoadingCard({ text, className }: LoadingCardProps) {
  return <div className={cn("card", className)}>{text}</div>;
}

export function ErrorCard({
  title,
  description = "Open the console for details.",
  className,
}: ErrorCardProps) {
  return (
    <div className={cn("card border-[color:rgba(255,59,48,0.35)]", className)}>
      <div className="mb-1.5 font-bold">{title}</div>
      <div className="muted">{description}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
  compact = false,
  centered = true,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "empty-state",
        compact && "empty-state-compact",
        centered && "empty-state-centered",
        className
      )}
    >
      <div className="mb-1.5 font-extrabold">{title}</div>
      {description ? (
        <div className={cn("muted", action ? "mb-3.5" : undefined)}>{description}</div>
      ) : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}
