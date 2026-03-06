import type { ProjectId } from "@entities/project";
import type { UserId } from "@entities/user";

export type StoryId = string;
export type StoryPriority = "low" | "medium" | "high";
export type StoryStatus = "todo" | "doing" | "done";

export interface Story {
  id: StoryId;
  name: string;
  description: string;
  priority: StoryPriority;
  project: ProjectId;
  createdAt: number;
  status: StoryStatus;
  ownerId: UserId;
}

export interface StoryFormValues {
  name: string;
  description: string;
  priority: StoryPriority;
  status: StoryStatus;
}

export type StoryCreateInput = StoryFormValues & {
  project: ProjectId;
  ownerId: UserId;
};

export type StoryUpdateInput = Partial<StoryCreateInput>;
