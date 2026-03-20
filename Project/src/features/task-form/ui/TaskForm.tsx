import { useMemo, useState, type FormEvent } from "react";
import type { Story } from "@entities/story";
import {
  type Task,
  type TaskCreateInput,
  validateTaskInput,
} from "@entities/task";
import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";
import { Select } from "@shared/ui/Select";
import { Textarea } from "@shared/ui/Textarea";

type Props = {
  initial?: Task | null;
  stories: Story[];
  onSubmit: (data: TaskCreateInput) => Promise<void> | void;
  onCancel?: () => void;
  submitText?: string;
  surface?: "card" | "plain";
};

export function TaskForm({
  initial = null,
  stories,
  onSubmit,
  onCancel,
  submitText,
  surface = "card",
}: Props) {
  const defaultStoryId = initial?.storyId ?? stories[0]?.id ?? "";
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState(initial?.priority ?? "medium");
  const [storyId, setStoryId] = useState(defaultStoryId);
  const [estimatedHours, setEstimatedHours] = useState(
    initial ? String(initial.estimatedHours) : ""
  );
  const [error, setError] = useState<string | null>(null);

  const formClassName = surface === "card" ? "card stack" : "stack project-form-plain";
  const title = useMemo(() => (initial ? "Edit task" : "Create task"), [initial]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const result = validateTaskInput({
      name,
      description,
      priority,
      storyId,
      estimatedHours,
      status: initial?.status ?? "todo",
      assigneeId: initial?.assigneeId ?? "",
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
      setStoryId(stories[0]?.id ?? "");
      setEstimatedHours("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className={formClassName} style={{ gap: 12 }}>
      <div className="stack" style={{ gap: 4 }}>
        <div style={{ fontWeight: 800, fontSize: 20 }}>{title}</div>
        <div className="muted" style={{ fontSize: 13 }}>
          {initial
            ? "Update the task details and save your changes. Status and assignee stay managed in task details."
            : "Add a task to one of the project history items. New tasks always start as To do."}
        </div>
      </div>

      <label className="stack" style={{ gap: 6 }}>
        <div style={{ fontWeight: 700 }}>Name</div>
        <Input
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="E.g. Configure CI pipeline"
          autoFocus
        />
      </label>

      <label className="stack" style={{ gap: 6 }}>
        <div style={{ fontWeight: 700 }}>Description</div>
        <Textarea
          value={description}
          onChange={event => setDescription(event.target.value)}
          rows={5}
          placeholder="Describe the expected task output..."
        />
      </label>

      <div className="form-grid">
        <label className="stack" style={{ gap: 6 }}>
          <div style={{ fontWeight: 700 }}>Story</div>
          <Select
            value={storyId}
            onChange={event => setStoryId(event.target.value)}
            disabled={stories.length === 0}
          >
            {stories.length === 0 && <option value="">No stories available</option>}
            {stories.map(story => (
              <option key={story.id} value={story.id}>
                {story.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="stack" style={{ gap: 6 }}>
          <div style={{ fontWeight: 700 }}>Estimated time (hours)</div>
          <Input
            type="number"
            min="0.25"
            step="0.25"
            value={estimatedHours}
            onChange={event => setEstimatedHours(event.target.value)}
            placeholder="E.g. 6"
          />
        </label>
      </div>

      <div className="form-grid">
        <label className="stack" style={{ gap: 6 }}>
          <div style={{ fontWeight: 700 }}>Priority</div>
          <Select
            value={priority}
            onChange={event => setPriority(event.target.value as typeof priority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
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
        <Button type="submit">{submitText ?? (initial ? "Save" : "Create")}</Button>
      </div>
    </form>
  );
}
