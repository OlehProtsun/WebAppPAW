import { useMemo, useState, type FormEvent } from "react";
import type { Story } from "@entities/story";
import {
  type Task,
  type TaskCreateInput,
  validateTaskInput,
} from "@entities/task";
import { Button } from "@shared/ui/Button";
import { FormError, FormField, FormHeading, FormShell } from "@shared/ui/FormParts";
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
    <FormShell onSubmit={handleSubmit} surface={surface}>
      <FormHeading
        title={title}
        description={
          initial
            ? "Update the task details and save your changes. Status and assignee stay managed in task details."
            : "Add a task to one of the project history items. New tasks always start as To do."
        }
      />

      <FormField label="Name">
        <Input
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="E.g. Configure CI pipeline"
          autoFocus
        />
      </FormField>

      <FormField label="Description">
        <Textarea
          value={description}
          onChange={event => setDescription(event.target.value)}
          rows={5}
          placeholder="Describe the expected task output..."
        />
      </FormField>

      <div className="form-grid">
        <FormField label="Story">
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
        </FormField>

        <FormField label="Estimated time (hours)">
          <Input
            type="number"
            min="0.25"
            step="0.25"
            value={estimatedHours}
            onChange={event => setEstimatedHours(event.target.value)}
            placeholder="E.g. 6"
          />
        </FormField>
      </div>

      <div className="form-grid">
        <FormField label="Priority">
          <Select
            value={priority}
            onChange={event => setPriority(event.target.value as typeof priority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
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
        <Button type="submit">{submitText ?? (initial ? "Save" : "Create")}</Button>
      </div>
    </FormShell>
  );
}
