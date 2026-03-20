import { nanoid } from "nanoid";
import type { ProjectId } from "@entities/project";
import { StoriesApi, type StoryId, type StoryStatus } from "@entities/story";
import { UsersApi, type UserId } from "@entities/user";
import type { StorageClient } from "@shared/api/storageClient";
import { safeJsonParse } from "@shared/lib/safeJson";
import type {
  Task,
  TaskCreateInput,
  TaskDraftInput,
  TaskId,
  TaskUpdateInput,
} from "../model/types";

const STORAGE_KEY = "Project.tasks.v1";

export class TasksApi {
  private storiesApi: StoriesApi;
  private usersApi: UsersApi;

  constructor(private storage: StorageClient) {
    this.storiesApi = new StoriesApi(storage);
    this.usersApi = new UsersApi();
  }

  private async readAll(): Promise<Task[]> {
    const raw = await this.storage.getItem(STORAGE_KEY);
    return safeJsonParse<Task[]>(raw, []);
  }

  private async writeAll(tasks: Task[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  private async ensureStoryExists(storyId: StoryId): Promise<void> {
    const story = await this.storiesApi.getById(storyId);

    if (!story) {
      throw new Error("Story not found");
    }
  }

  private async ensureAssignableUser(assigneeId: UserId | null): Promise<void> {
    if (!assigneeId) {
      return;
    }

    const user = await this.usersApi.getById(assigneeId);

    if (!user) {
      throw new Error("Assignee not found");
    }

    if (user.role === "admin") {
      throw new Error("Only developer or devops users can be assigned");
    }
  }

  private normalizeDraft(
    input: TaskDraftInput,
    current: Task | null,
    now: number
  ): Omit<Task, "id" | "createdAt"> {
    const status = input.status;
    const assigneeId = input.assigneeId ?? null;
    let startedAt = current?.startedAt ?? null;
    let completedAt = current?.completedAt ?? null;

    if (status === "todo") {
      startedAt = null;
      completedAt = null;
    }

    if (status === "doing") {
      if (!assigneeId) {
        throw new Error("Assignee is required for tasks in progress");
      }

      startedAt = startedAt ?? now;
      completedAt = null;
    }

    if (status === "done") {
      if (!assigneeId) {
        throw new Error("Assignee is required for completed tasks");
      }

      startedAt = startedAt ?? now;
      completedAt = current?.completedAt ?? now;
    }

    return {
      name: input.name,
      description: input.description,
      priority: input.priority,
      storyId: input.storyId,
      estimatedHours: input.estimatedHours,
      status,
      createdById: current?.createdById ?? input.createdById ?? null,
      startedAt,
      completedAt,
      assigneeId,
    };
  }

  private buildDraftFromTask(task: Task, patch?: TaskUpdateInput): TaskDraftInput {
    return {
      name: patch?.name ?? task.name,
      description: patch?.description ?? task.description,
      priority: patch?.priority ?? task.priority,
      storyId: patch?.storyId ?? task.storyId,
      estimatedHours: patch?.estimatedHours ?? task.estimatedHours,
      status: patch?.status ?? task.status,
      createdById: patch?.createdById ?? task.createdById,
      assigneeId:
        patch?.assigneeId === undefined ? task.assigneeId : patch.assigneeId,
    };
  }

  private resolveStoryStatus(tasks: Task[]): StoryStatus {
    if (tasks.length === 0) {
      return "todo";
    }

    if (tasks.every(task => task.status === "done")) {
      return "done";
    }

    if (tasks.some(task => task.status !== "todo")) {
      return "doing";
    }

    return "todo";
  }

  private async syncStoryStatuses(storyIds: StoryId[], tasks: Task[]): Promise<void> {
    const uniqueStoryIds = [...new Set(storyIds)];

    await Promise.all(
      uniqueStoryIds.map(async storyId => {
        const story = await this.storiesApi.getById(storyId);

        if (!story) {
          return;
        }

        const storyTasks = tasks.filter(task => task.storyId === storyId);

        if (storyTasks.length === 0) {
          return;
        }

        const nextStatus = this.resolveStoryStatus(storyTasks);

        if (story.status !== nextStatus) {
          await this.storiesApi.update(storyId, { status: nextStatus });
        }
      })
    );
  }

  async listByProject(projectId: ProjectId): Promise<Task[]> {
    const [tasks, stories] = await Promise.all([
      this.readAll(),
      this.storiesApi.listByProject(projectId),
    ]);
    const storyIds = new Set(stories.map(story => story.id));

    return tasks
      .filter(task => storyIds.has(task.storyId))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async listByStory(storyId: StoryId): Promise<Task[]> {
    const tasks = await this.readAll();
    return tasks
      .filter(task => task.storyId === storyId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async getById(id: TaskId): Promise<Task | null> {
    const tasks = await this.readAll();
    return tasks.find(task => task.id === id) ?? null;
  }

  async create(input: TaskCreateInput): Promise<Task> {
    await this.ensureStoryExists(input.storyId);
    await this.ensureAssignableUser(input.assigneeId);

    const tasks = await this.readAll();
    const now = Date.now();
    const task: Task = {
      id: nanoid(),
      createdAt: now,
      ...this.normalizeDraft(input, null, now),
    };
    const next = [...tasks, task];

    await this.writeAll(next);
    await this.syncStoryStatuses([task.storyId], next);

    return task;
  }

  async update(id: TaskId, patch: TaskUpdateInput): Promise<Task> {
    const tasks = await this.readAll();
    const index = tasks.findIndex(task => task.id === id);

    if (index === -1) {
      throw new Error("Task not found");
    }

    const current = tasks[index];
    const draft = this.buildDraftFromTask(current, patch);

    await this.ensureStoryExists(draft.storyId);
    await this.ensureAssignableUser(draft.assigneeId);

    const updated: Task = {
      ...current,
      ...this.normalizeDraft(draft, current, Date.now()),
    };
    const next = [...tasks];

    next[index] = updated;
    await this.writeAll(next);
    await this.syncStoryStatuses([current.storyId, updated.storyId], next);

    return updated;
  }

  async assignUser(id: TaskId, assigneeId: UserId): Promise<Task> {
    const task = await this.getById(id);

    if (!task) {
      throw new Error("Task not found");
    }

    return this.update(id, { assigneeId });
  }

  async startTask(id: TaskId, assigneeId: UserId): Promise<Task> {
    const task = await this.getById(id);

    if (!task) {
      throw new Error("Task not found");
    }

    return this.update(id, {
      assigneeId,
      status: "doing",
    });
  }

  async markDone(id: TaskId): Promise<Task> {
    return this.update(id, { status: "done" });
  }

  async remove(id: TaskId): Promise<void> {
    const tasks = await this.readAll();
    const task = tasks.find(item => item.id === id);

    if (!task) {
      return;
    }

    const next = tasks.filter(item => item.id !== id);
    await this.writeAll(next);
    await this.syncStoryStatuses([task.storyId], next);
  }

  async removeByStory(storyId: StoryId): Promise<void> {
    const tasks = await this.readAll();
    const next = tasks.filter(task => task.storyId !== storyId);

    if (next.length === tasks.length) {
      return;
    }

    await this.writeAll(next);
  }

  async removeByProject(projectId: ProjectId): Promise<void> {
    const stories = await this.storiesApi.listByProject(projectId);
    const storyIds = new Set(stories.map(story => story.id));
    const tasks = await this.readAll();

    await this.writeAll(tasks.filter(task => !storyIds.has(task.storyId)));
  }
}
