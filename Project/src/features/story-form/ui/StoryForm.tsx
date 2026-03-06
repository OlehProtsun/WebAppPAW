import { useEffect, useState, type FormEvent } from "react";
import type { Story, StoryFormValues } from "@entities/story";
import { validateStoryInput } from "@entities/story";
import { Button } from "@shared/ui/Button";
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

  useEffect(() => {
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setPriority(initial?.priority ?? "medium");
    setStatus(initial?.status ?? "todo");
    setError(null);
  }, [initial?.id]);

  const formClassName = surface === "card" ? "card stack" : "stack project-form-plain";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const result = validateStoryInput({
      name,
      description,
      priority,
      status,
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
    <form onSubmit={handleSubmit} className={formClassName} style={{ gap: 12 }}>
      <div className="stack" style={{ gap: 4 }}>
        <div style={{ fontWeight: 800, fontSize: 20 }}>
          {initial ? "Edit history item" : "Create history item"}
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          {initial
            ? "Update the history item details and save your changes."
            : "Add a new history item to the current project."}
        </div>
      </div>

      <label className="stack" style={{ gap: 6 }}>
        <div style={{ fontWeight: 700 }}>Name</div>
        <Input
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="E.g. Improve onboarding"
          autoFocus
        />
      </label>

      <label className="stack" style={{ gap: 6 }}>
        <div style={{ fontWeight: 700 }}>Description</div>
        <Textarea
          value={description}
          onChange={event => setDescription(event.target.value)}
          rows={5}
          placeholder="Describe the expected outcome..."
        />
      </label>

      <div className="form-grid">
        <label className="stack" style={{ gap: 6 }}>
          <div style={{ fontWeight: 700 }}>Priority</div>
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
        </label>

        <label className="stack" style={{ gap: 6 }}>
          <div style={{ fontWeight: 700 }}>Status</div>
          <Select
            value={status}
            onChange={event =>
              setStatus(event.target.value as StoryFormValues["status"])
            }
          >
            <option value="todo">To do</option>
            <option value="doing">In progress</option>
            <option value="done">Done</option>
          </Select>
        </label>
      </div>

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
    </form>
  );
}
