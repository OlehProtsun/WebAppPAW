import type { StorageClient } from "@shared/api/storageClient";
import { safeJsonParse } from "@shared/lib/safeJson";
import type { ProjectId } from "../model/types";

const STORAGE_KEY = "Project.pinnedProjects.v1";

export class PinnedProjectsApi {
  constructor(private storage: StorageClient) {}

  async list(): Promise<ProjectId[]> {
    const raw = await this.storage.getItem(STORAGE_KEY);
    return safeJsonParse<ProjectId[]>(raw, []);
  }

  private async write(projectIds: ProjectId[]): Promise<ProjectId[]> {
    const uniqueProjectIds = [...new Set(projectIds)];
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(uniqueProjectIds));
    return uniqueProjectIds;
  }

  async toggle(projectId: ProjectId): Promise<ProjectId[]> {
    const currentIds = await this.list();

    if (currentIds.includes(projectId)) {
      return this.write(currentIds.filter(id => id !== projectId));
    }

    return this.write([projectId, ...currentIds]);
  }

  async remove(projectId: ProjectId): Promise<ProjectId[]> {
    const currentIds = await this.list();

    if (!currentIds.includes(projectId)) {
      return currentIds;
    }

    return this.write(currentIds.filter(id => id !== projectId));
  }
}
