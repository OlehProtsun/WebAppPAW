export type ProjectId = string;

export interface Project {
  id: ProjectId;
  name: string;
  description: string;
}

export type ProjectCreateInput = Omit<Project, "id">;
export type ProjectUpdateInput = Partial<ProjectCreateInput>;