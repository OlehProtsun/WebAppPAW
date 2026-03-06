import type {
  StoryFormValues,
  StoryPriority,
  StoryStatus,
} from "./types";

const priorities = new Set<StoryPriority>(["low", "medium", "high"]);
const statuses = new Set<StoryStatus>(["todo", "doing", "done"]);

export function validateStoryInput(input: StoryFormValues) {
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

  return {
    ok: true as const,
    value: {
      name,
      description,
      priority: input.priority,
      status: input.status,
    },
  };
}
