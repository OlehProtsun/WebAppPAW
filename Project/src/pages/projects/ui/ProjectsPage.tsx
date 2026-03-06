import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { ActiveProjectApi, PinnedProjectsApi, ProjectsApi } from "@entities/project";
import { ProjectForm } from "@features/project-form";
import { LocalStorageClient } from "@shared/api/localStorageClient";
import { qk } from "@shared/lib/queryKeys";
import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";
import { ModalDialog } from "@shared/ui/ModalDialog";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storage = useMemo(() => new LocalStorageClient(), []);
  const projectsApi = useMemo(() => new ProjectsApi(storage), [storage]);
  const activeProjectApi = useMemo(() => new ActiveProjectApi(storage), [storage]);
  const pinnedProjectsApi = useMemo(() => new PinnedProjectsApi(storage), [storage]);

  const [searchValue, setSearchValue] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const projectsQuery = useQuery({
    queryKey: qk.projects,
    queryFn: () => projectsApi.list(),
  });

  const activeProjectQuery = useQuery({
    queryKey: qk.activeProject,
    queryFn: () => activeProjectApi.get(),
  });

  const pinnedProjectsQuery = useQuery({
    queryKey: qk.pinnedProjects,
    queryFn: () => pinnedProjectsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => projectsApi.create(data),
    onSuccess: async project => {
      await queryClient.invalidateQueries({ queryKey: qk.projects });
      await activeProjectApi.set(project.id);
      queryClient.setQueryData(qk.activeProject, project.id);
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: (projectId: string) => pinnedProjectsApi.toggle(projectId),
    onSuccess: pinnedProjectIds => {
      queryClient.setQueryData(qk.pinnedProjects, pinnedProjectIds);
    },
  });

  const projects = projectsQuery.data ?? [];
  const pinnedProjectIds = pinnedProjectsQuery.data ?? [];
  const pinnedProjectIdSet = useMemo(() => new Set(pinnedProjectIds), [pinnedProjectIds]);
  const searchTerm = searchValue.trim().toLowerCase();

  const filteredProjects = useMemo(() => {
    const visibleProjects = searchTerm
      ? projects.filter(project => project.name.toLowerCase().includes(searchTerm))
      : projects;

    const pinnedProjects = visibleProjects.filter(project => pinnedProjectIdSet.has(project.id));
    const regularProjects = visibleProjects.filter(project => !pinnedProjectIdSet.has(project.id));

    return [...pinnedProjects, ...regularProjects];
  }, [pinnedProjectIdSet, projects, searchTerm]);

  async function openProject(projectId: string) {
    await activeProjectApi.set(projectId);
    queryClient.setQueryData(qk.activeProject, projectId);
    navigate(`/projects/${projectId}`);
  }

  return (
    <div className="stack" style={{ gap: 18 }}>
      <header className="card stack projects-header-sticky" style={{ gap: 16 }}>
        <div className="row page-header-row">
          <div className="stack" style={{ gap: 6 }}>
            <span className="eyebrow">Workspace</span>
            <h1 style={{ margin: 0 }}>Project list</h1>
            <p className="muted page-lead">
              Find a project by name, create a new one, open it fast, or pin it to keep it first.
            </p>
          </div>

          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            Add new
          </Button>
        </div>

        <div className="projects-toolbar">
          <Input
            value={searchValue}
            onChange={event => setSearchValue(event.target.value)}
            placeholder="Search by project name"
            aria-label="Search projects by name"
          />
          <div className="muted projects-toolbar-meta">
            {projects.length === 1 ? "1 project" : `${projects.length} projects`}
          </div>
        </div>
      </header>

      {projectsQuery.isLoading && <div className="card">Loading projects...</div>}

      {projectsQuery.isError && (
        <div className="card" style={{ borderColor: "rgba(255,59,48,0.35)" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Error loading projects</div>
          <div className="muted">Open the console for details.</div>
        </div>
      )}

      {!projectsQuery.isLoading && !projectsQuery.isError && projects.length === 0 && (
        <div className="empty-state empty-state-centered">
          <div style={{ fontWeight: 800, marginBottom: 6 }}>No projects yet</div>
          <div className="muted" style={{ marginBottom: 14 }}>
            Start by creating your first project.
          </div>
          <div>
            <Button type="button" onClick={() => setIsCreateOpen(true)}>
              Add new
            </Button>
          </div>
        </div>
      )}

      {!projectsQuery.isLoading &&
        !projectsQuery.isError &&
        projects.length > 0 &&
        filteredProjects.length === 0 && (
          <div className="empty-state empty-state-centered">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Nothing found</div>
            <div className="muted" style={{ marginBottom: 14 }}>
              No project matches "{searchValue}".
            </div>
            <div>
              <Button type="button" onClick={() => setSearchValue("")}>
                Clear search
              </Button>
            </div>
          </div>
        )}

      {filteredProjects.length > 0 && (
        <section className="project-grid">
          {filteredProjects.map(project => {
            const isSelected = project.id === activeProjectQuery.data;
            const isPinned = pinnedProjectIdSet.has(project.id);

            return (
              <article
                key={project.id}
                className={`project-tile ${isSelected ? "project-tile-selected" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => void openProject(project.id)}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void openProject(project.id);
                  }
                }}
              >
                <div className="project-tile-head">
                  <div className="project-tile-title-wrap">
                    <div className="project-tile-title">{project.name}</div>
                    <div className="badge-row">
                      {isSelected && <span className="pill pill-active">Selected</span>}
                    </div>
                  </div>

                  <Button
                    type="button"
                    className={`pin-toggle ${isPinned ? "pin-toggle-active" : ""}`}
                    aria-label={isPinned ? "Unpin project" : "Pin project"}
                    aria-pressed={isPinned}
                    disabled={togglePinMutation.isPending}
                    onClick={event => {
                      event.stopPropagation();
                      void togglePinMutation.mutateAsync(project.id);
                    }}
                    onKeyDown={event => {
                      event.stopPropagation();
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="pin-toggle-icon" aria-hidden="true">
                      <path
                        d="M9 3h6l-1 5 3 3v1h-4v8l-1-1-1 1v-8H7v-1l3-3-1-5Z"
                        fill="currentColor"
                      />
                    </svg>
                  </Button>
                </div>

                <div className="project-tile-description">
                  {project.description || "No description yet."}
                </div>

                <div className="project-meta">
                  <span>Created {dateFormatter.format(project.createdAt)}</span>
                  <span>Updated {dateFormatter.format(project.updatedAt)}</span>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <ModalDialog
        open={isCreateOpen}
        onClose={() => {
          if (createMutation.isPending) {
            return;
          }

          setIsCreateOpen(false);
        }}
        ariaLabel="Create project"
      >
        <ProjectForm
          surface="plain"
          submitText={createMutation.isPending ? "Creating..." : "Create project"}
          onCancel={() => {
            if (createMutation.isPending) {
              return;
            }

            setIsCreateOpen(false);
          }}
          onSubmit={async data => {
            const project = await createMutation.mutateAsync(data);
            setIsCreateOpen(false);
            navigate(`/projects/${project.id}`);
          }}
        />
      </ModalDialog>
    </div>
  );
}
