import type { StorageClient } from "@shared/api/storageClient";
import type { ProjectId } from "../model/types";

const STORAGE_KEY = "Project.activeProject.v1";

export class ActiveProjectApi {
  constructor(private storage: StorageClient) {}

  async get(): Promise<ProjectId | null> {
    const projectId = await this.storage.getItem(STORAGE_KEY);
    return projectId ?? null;
  }

  async set(projectId: ProjectId | null): Promise<ProjectId | null> {
    if (!projectId) {
      await this.storage.removeItem(STORAGE_KEY);
      return null;
    }

    await this.storage.setItem(STORAGE_KEY, projectId);
    return projectId;
  }
}
