import { useMemo, useState, type FormEvent } from "react";
import type { Project, ProjectCreateInput } from "@entities/project";
import { validateProjectInput } from "@entities/project";
import { Button } from "@shared/ui/Button";
import { FormError, FormField, FormHeading, FormShell } from "@shared/ui/FormParts";
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
    <FormShell onSubmit={handleSubmit} surface={surface}>
      <FormHeading
        title={title}
        description={
          initial
            ? "Update the project name and description."
            : "Create a new project in the same minimal style as the rest of the workspace."
        }
      />

      <FormField label="Name">
        <Input
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="E.g. Website redesign"
          autoFocus
        />
      </FormField>

      <FormField label="Description">
        <Textarea
          value={description}
          onChange={event => setDescription(event.target.value)}
          rows={5}
          placeholder="Short description..."
        />
      </FormField>

      <FormError message={error} />

      <div className="form-actions">
        {onCancel && (
          <Button type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{submitText ?? (initial ? "Save" : "Create")}</Button>
      </div>
    </FormShell>
  );
}
