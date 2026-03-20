export const qk = {
  currentUser: ["current-user"] as const,
  users: ["users"] as const,
  projects: ["projects"] as const,
  activeProject: ["active-project"] as const,
  pinnedProjects: ["pinned-projects"] as const,
  storyList: ["stories"] as const,
  stories: (projectId: string) => ["stories", projectId] as const,
  taskList: ["tasks"] as const,
  tasks: (projectId: string) => ["tasks", projectId] as const,
  task: (taskId: string) => ["task", taskId] as const,
};
