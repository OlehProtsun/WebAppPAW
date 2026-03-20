import type {
  TaskFormValues,
  TaskPriority,
  TaskStatus,
} from "./types";

const priorities = new Set<TaskPriority>(["low", "medium", "high"]);
const statuses = new Set<TaskStatus>(["todo", "doing", "done"]);

export function validateTaskInput(input: TaskFormValues) {
  const name = input.name.trim();

  if (!name) {
    return { ok: false as const, error: "Name is required" };
  }

  if (name.length > 120) {
    return { ok: false as const, error: "Name is too long" };
  }

  const description = input.description.trim();

  if (description.length > 4000) {
    return { ok: false as const, error: "Description is too long" };
  }

  if (!priorities.has(input.priority)) {
    return { ok: false as const, error: "Priority is invalid" };
  }

  if (!statuses.has(input.status)) {
    return { ok: false as const, error: "Status is invalid" };
  }

  const storyId = input.storyId.trim();

  if (!storyId) {
    return { ok: false as const, error: "Story is required" };
  }

  const estimatedHours = Number(input.estimatedHours);

  if (!Number.isFinite(estimatedHours) || estimatedHours <= 0) {
    return { ok: false as const, error: "Estimated time must be greater than 0" };
  }

  if (estimatedHours > 1000) {
    return { ok: false as const, error: "Estimated time is too large" };
  }

  const assigneeId = input.assigneeId.trim() || null;

  if (input.status === "doing" && !assigneeId) {
    return { ok: false as const, error: "Assignee is required for tasks in progress" };
  }

  if (input.status === "done" && !assigneeId) {
    return { ok: false as const, error: "Assignee is required for completed tasks" };
  }

  return {
    ok: true as const,
    value: {
      name,
      description,
      priority: input.priority,
      storyId,
      estimatedHours: Math.round(estimatedHours * 100) / 100,
      status: input.status,
      assigneeId,
    },
  };
}
