import type { StoryPriority, StoryStatus } from "@entities/story";
import type { TaskPriority, TaskStatus } from "@entities/task";

export type WorkItemPriority = StoryPriority | TaskPriority;
export type WorkItemStatus = StoryStatus | TaskStatus;

export const workItemPriorityClassName = {
  low: "story-badge story-badge-low",
  medium: "story-badge story-badge-medium",
  high: "story-badge story-badge-high",
} as const satisfies Record<WorkItemPriority, string>;

export const workItemStatusClassName = {
  todo: "story-badge story-badge-todo",
  doing: "story-badge story-badge-doing",
  done: "story-badge story-badge-done",
} as const satisfies Record<WorkItemStatus, string>;

export const workItemStatusLabel = {
  todo: "To do",
  doing: "In progress",
  done: "Done",
} as const satisfies Record<WorkItemStatus, string>;
