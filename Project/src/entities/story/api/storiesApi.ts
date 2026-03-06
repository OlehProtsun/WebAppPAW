import { nanoid } from "nanoid";
import type { StorageClient } from "@shared/api/storageClient";
import { safeJsonParse } from "@shared/lib/safeJson";
import type {
  Story,
  StoryCreateInput,
  StoryId,
  StoryUpdateInput,
} from "../model/types";

const STORAGE_KEY = "Project.stories.v1";

export class StoriesApi {
  constructor(private storage: StorageClient) {}

  private async readAll(): Promise<Story[]> {
    const raw = await this.storage.getItem(STORAGE_KEY);
    return safeJsonParse<Story[]>(raw, []);
  }

  private async writeAll(stories: Story[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(stories));
  }

  async listByProject(projectId: string): Promise<Story[]> {
    const stories = await this.readAll();
    return stories
      .filter(story => story.project === projectId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async getById(id: StoryId): Promise<Story | null> {
    const stories = await this.readAll();
    return stories.find(story => story.id === id) ?? null;
  }

  async create(input: StoryCreateInput): Promise<Story> {
    const stories = await this.readAll();
    const story: Story = {
      id: nanoid(),
      name: input.name,
      description: input.description,
      priority: input.priority,
      project: input.project,
      createdAt: Date.now(),
      status: input.status,
      ownerId: input.ownerId,
    };

    await this.writeAll([...stories, story]);
    return story;
  }

  async update(id: StoryId, patch: StoryUpdateInput): Promise<Story> {
    const stories = await this.readAll();
    const index = stories.findIndex(story => story.id === id);

    if (index === -1) {
      throw new Error("Story not found");
    }

    const updated: Story = {
      ...stories[index],
      ...patch,
    };

    const next = [...stories];
    next[index] = updated;
    await this.writeAll(next);
    return updated;
  }

  async remove(id: StoryId): Promise<void> {
    const stories = await this.readAll();
    await this.writeAll(stories.filter(story => story.id !== id));
  }

  async removeByProject(projectId: string): Promise<void> {
    const stories = await this.readAll();
    await this.writeAll(stories.filter(story => story.project !== projectId));
  }
}
