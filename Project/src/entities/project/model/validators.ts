import type { ProjectCreateInput } from "./types";

export function validateProjectInput(input: ProjectCreateInput) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: "Name is required" };
  if (name.length > 120) return { ok: false as const, error: "Name is too long" };

  const description = input.description.trim();
  if (description.length > 2000) return { ok: false as const, error: "Description is too long" };

  return { ok: true as const, value: { name, description } };
}