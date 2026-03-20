import { useMemo, useState, type FormEvent } from "react";
import type { Project, ProjectCreateInput } from "@entities/project";
import { validateProjectInput } from "@entities/project";
import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";
import { Textarea } from "@shared/ui/Textarea";

type Props = {
  initial?: Project | null;
  onSubmit: (data: ProjectCreateInput) => Promise<void> | void;
  onCancel?: () => void;
  submitText?: string;
  surface?: "card" | "plain";
};

export function ProjectForm({
  initial = null,
  onSubmit,
  onCancel,
  submitText,
  surface = "card",
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (initial ? "Edit project" : "Create project"), [initial]);
  const formClassName = surface === "card" ? "card stack" : "stack project-form-plain";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const result = validateProjectInput({ name, description });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    await onSubmit(result.value);

    if (!initial) {
      setName("");
      setDescription("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className={formClassName} style={{ gap: 12 }}>
      <div className="stack" style={{ gap: 4 }}>
        <div style={{ fontWeight: 800, fontSize: 20 }}>{title}</div>
        <div className="muted" style={{ fontSize: 13 }}>
          {initial
            ? "Update the project name and description."
            : "Create a new project in the same minimal style as the rest of the workspace."}
        </div>
      </div>

      <label className="stack" style={{ gap: 6 }}>
        <div style={{ fontWeight: 700 }}>Name</div>
        <Input
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="E.g. Website redesign"
          autoFocus
        />
      </label>

      <label className="stack" style={{ gap: 6 }}>
        <div style={{ fontWeight: 700 }}>Description</div>
        <Textarea
          value={description}
          onChange={event => setDescription(event.target.value)}
          rows={5}
          placeholder="Short description..."
        />
      </label>

      {error && (
        <div
          className="card card-sm"
          style={{
            borderColor: "rgba(255,59,48,0.35)",
            background: "rgba(255,59,48,0.06)",
          }}
        >
          <div style={{ fontWeight: 800 }}>Error</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {error}
          </div>
        </div>
      )}

      <div className="form-actions">
        {onCancel && (
          <Button type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{submitText ?? (initial ? "Save" : "Create")}</Button>
      </div>
    </form>
  );
}
