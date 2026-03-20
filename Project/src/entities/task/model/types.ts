import type { StoryId } from "@entities/story";
import type { UserId } from "@entities/user";

export type TaskId = string;
export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "doing" | "done";

export interface Task {
  id: TaskId;
  name: string;
  description: string;
  priority: TaskPriority;
  storyId: StoryId;
  estimatedHours: number;
  status: TaskStatus;
  createdAt: number;
  createdById: UserId | null;
  startedAt: number | null;
  completedAt: number | null;
  assigneeId: UserId | null;
}

export interface TaskFormValues {
  name: string;
  description: string;
  priority: TaskPriority;
  storyId: StoryId | "";
  estimatedHours: string;
  status: TaskStatus;
  assigneeId: UserId | "";
}

export interface TaskDraftInput {
  name: string;
  description: string;
  priority: TaskPriority;
  storyId: StoryId;
  estimatedHours: number;
  status: TaskStatus;
  assigneeId: UserId | null;
  createdById?: UserId | null;
}

export type TaskCreateInput = TaskDraftInput;
export type TaskUpdateInput = Partial<TaskDraftInput>;
