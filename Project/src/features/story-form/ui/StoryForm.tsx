import { useState, type FormEvent } from "react";
import type { Story, StoryFormValues } from "@entities/story";
import { validateStoryInput } from "@entities/story";
import { Button } from "@shared/ui/Button";
import { FormError, FormField, FormHeading, FormShell } from "@shared/ui/FormParts";
import { Input } from "@shared/ui/Input";
import { Select } from "@shared/ui/Select";
import { Textarea } from "@shared/ui/Textarea";

type Props = {
  initial?: Story | null;
  onSubmit: (data: StoryFormValues) => Promise<void> | void;
  onCancel?: () => void;
  submitText?: string;
  surface?: "card" | "plain";
};

export function StoryForm({
  initial = null,
  onSubmit,
  onCancel,
  submitText,
  surface = "card",
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<StoryFormValues["priority"]>(
    initial?.priority ?? "medium"
  );
  const [status, setStatus] = useState<StoryFormValues["status"]>(
    initial?.status ?? "todo"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const result = validateStoryInput({
      name,
      description,
      priority,
      status: initial?.status ?? status,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    await onSubmit(result.value);

    if (!initial) {
      setName("");
      setDescription("");
      setPriority("medium");
      setStatus("todo");
    }
  }

  return (
    <FormShell onSubmit={handleSubmit} surface={surface}>
      <FormHeading
        title={initial ? "Edit history item" : "Create history item"}
        description={
          initial
            ? "Update the history item details and save your changes."
            : "Add a new history item to the current project."
        }
      />

      <FormField label="Name">
        <Input
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="E.g. Improve onboarding"
          autoFocus
        />
      </FormField>

      <FormField label="Description">
        <Textarea
          value={description}
          onChange={event => setDescription(event.target.value)}
          rows={5}
          placeholder="Describe the expected outcome..."
        />
      </FormField>

      <div className="form-grid">
        <FormField label="Priority">
          <Select
            value={priority}
            onChange={event =>
              setPriority(event.target.value as StoryFormValues["priority"])
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </FormField>

        <FormField
          label="Status"
          hint={initial ? "Status is managed automatically by task progress." : undefined}
        >
          <Select
            value={status}
            disabled={Boolean(initial)}
            onChange={event =>
              setStatus(event.target.value as StoryFormValues["status"])
            }
          >
            <option value="todo">To do</option>
            <option value="doing">In progress</option>
            <option value="done">Done</option>
          </Select>
        </FormField>
      </div>

      <FormError message={error} />

      <div className="form-actions">
        {onCancel && (
          <Button type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}

        {!initial && !onCancel && (
          <Button
            type="button"
            onClick={() => {
              setName("");
              setDescription("");
              setPriority("medium");
              setStatus("todo");
              setError(null);
            }}
          >
            Clear
          </Button>
        )}

        <Button type="submit">
          {submitText ?? (initial ? "Save" : "Create")}
        </Button>
      </div>
    </FormShell>
  );
}
