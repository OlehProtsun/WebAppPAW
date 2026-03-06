import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, useNavigate } from "react-router";
import { ActiveProjectApi, ProjectsApi } from "@entities/project";
import { CurrentUserManager } from "@entities/user";
import { LocalStorageClient } from "@shared/api/localStorageClient";
import { qk } from "@shared/lib/queryKeys";
import { Button } from "@shared/ui/Button";
import { Select } from "@shared/ui/Select";

export function AppLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storage = useMemo(() => new LocalStorageClient(), []);
  const projectsApi = useMemo(() => new ProjectsApi(storage), [storage]);
  const activeProjectApi = useMemo(() => new ActiveProjectApi(storage), [storage]);
  const currentUserManager = useMemo(() => new CurrentUserManager(), []);

  const currentUserQuery = useQuery({
    queryKey: qk.currentUser,
    queryFn: () => currentUserManager.getCurrentUser(),
  });

  const projectsQuery = useQuery({
    queryKey: qk.projects,
    queryFn: () => projectsApi.list(),
  });

  const activeProjectQuery = useQuery({
    queryKey: qk.activeProject,
    queryFn: () => activeProjectApi.get(),
  });

  const selectProjectMutation = useMutation({
    mutationFn: (projectId: string | null) => activeProjectApi.set(projectId),
    onSuccess: async projectId => {
      queryClient.setQueryData(qk.activeProject, projectId);
      await queryClient.invalidateQueries({ queryKey: qk.activeProject });
    },
  });

  const currentUserName = currentUserQuery.data
    ? `${currentUserQuery.data.firstName} ${currentUserQuery.data.lastName}`
    : "Loading...";
  const projectOptions = projectsQuery.data ?? [];
  const activeProjectId = activeProjectQuery.data ?? null;
  const projectPlaceholder = projectsQuery.isLoading
    ? "Loading projects..."
    : projectOptions.length > 0
      ? "Choose a project"
      : "No projects available";

  return (
    <div>
      <header className="topbar">
        <div className="topbar-shell">
          <div className="topbar-meta">
            <div className="topbar-project-group">
              <label className="topbar-project">
                <span className="topbar-label">Selected project</span>
                <Select
                  className="topbar-select"
                  value={activeProjectId ?? ""}
                  disabled={
                    projectsQuery.isLoading ||
                    selectProjectMutation.isPending ||
                    projectOptions.length === 0
                  }
                  onChange={event => {
                    const value = event.target.value;
                    selectProjectMutation.mutate(value || null);
                    navigate(value ? `/projects/${value}` : "/projects");
                  }}
                >
                  <option value="">{projectPlaceholder}</option>
                  {projectOptions.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </label>

              <Button
                type="button"
                className="topbar-open-btn"
                onClick={() => {
                  if (!activeProjectId) {
                    return;
                  }

                  navigate(`/projects/${activeProjectId}`);
                }}
                disabled={!activeProjectId}
              >
                Open
              </Button>
            </div>

            <div className="topbar-user">
              <span className="topbar-label">Signed in as</span>
              <div className="topbar-user-name">{currentUserName}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
