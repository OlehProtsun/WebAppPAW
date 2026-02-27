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
    if (!initial) {
      setName("");
      setDescription("");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10, padding: 12, border: "1px solid #333", borderRadius: 12 }}>
      <div style={{ fontWeight: 700 }}>{title}</div>

      <label style={{ display: "grid", gap: 6 }}>
        <div>Name</div>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="E.g. Website redesign" />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <div>Description</div>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Short description..." />
      </label>

      {error && <div style={{ color: "crimson" }}>{error}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <Button type="submit">{submitText ?? (initial ? "Save" : "Create")}</Button>
        {onCancel && (
          <Button type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}