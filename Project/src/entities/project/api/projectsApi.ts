import { nanoid } from "nanoid";
import type { StorageClient } from "@shared/api/storageClient";
import { safeJsonParse } from "@shared/lib/safeJson";
import type { Project, ProjectCreateInput, ProjectId, ProjectUpdateInput } from "../model/types";

const STORAGE_KEY ="Project.projects.v1";

export class ProjectsApi {
  constructor(private storage: StorageClient) {}

  private async readAll(): Promise<Project[]> {
    const raw = await this.storage.getItem(STORAGE_KEY);
    return safeJsonParse<Project[]>(raw, []);
  }

  private async writeAll(projects: Project[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  async list(): Promise<Project[]> {
    const projects = await this.readAll();
    return [...projects].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getById(id: ProjectId): Promise<Project | null> {
    const projects = await this.readAll();
    return projects.find(p => p.id === id) ?? null;
  }

  async create(input: ProjectCreateInput): Promise<Project> {
    const projects = await this.readAll();
    const project: Project = { id: nanoid(), ...input };
    await this.writeAll([...projects, project]);
    return project;
  }

  async update(id: ProjectId, patch: ProjectUpdateInput): Promise<Project> {
    const projects = await this.readAll();
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) throw new Error("Project not found");

    const updated: Project = { ...projects[idx], ...patch };
    const next = [...projects];
    next[idx] = updated;

    await this.writeAll(next);
    return updated;
  }

  async remove(id: ProjectId): Promise<void> {
    const projects = await this.readAll();
    await this.writeAll(projects.filter(p => p.id !== id));
  }
}