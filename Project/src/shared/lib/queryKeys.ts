export const qk = {
  currentUser: ["current-user"] as const,
  projects: ["projects"] as const,
  activeProject: ["active-project"] as const,
  pinnedProjects: ["pinned-projects"] as const,
  storyList: ["stories"] as const,
  stories: (projectId: string) => ["stories", projectId] as const,
};
