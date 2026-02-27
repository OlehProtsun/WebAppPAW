import { useMemo, useState } from "react";
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
};

export function ProjectForm({ initial = null, onSubmit, onCancel, submitText }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (initial ? "Edit project" : "Create project"), [initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = validateProjectInput({ name, description });
    if (!res.ok) {
      setError(res.error);
      return;
    }

    await onSubmit(res.value);

    // clear тільки для create
    if (!initial) {
      setName("");
      setDescription("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card stack" style={{ gap: 12 }}>
      <div className="row">
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {initial ? "Update name and description and save changes." : "Fill in the fields and create a new project."}
          </div>
        </div>

        {initial && onCancel && (
          <Button type="button" onClick={onCancel}>
            Close
          </Button>
        )}
      </div>

      <label className="stack" style={{ gap: 6 }}>
        <div style={{ fontWeight: 700 }}>Name</div>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="E.g. Website redesign" />
      </label>

      <label className="stack" style={{ gap: 6 }}>
        <div style={{ fontWeight: 700 }}>Description</div>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
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

      <div style={{ display: "flex", gap: 10 }}>
        <Button type="submit">{submitText ?? (initial ? "Save" : "Create")}</Button>
        {!initial && (
          <Button
            type="button"
            onClick={() => {
              setName("");
              setDescription("");
              setError(null);
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </form>
  );
}