import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { ActiveProjectApi, ProjectsApi } from "@entities/project";
import { StoriesApi, type Story, type StoryFormValues } from "@entities/story";
import { CurrentUserManager } from "@entities/user";
import { StoryForm } from "@features/story-form";
import { LocalStorageClient } from "@shared/api/localStorageClient";
import { qk } from "@shared/lib/queryKeys";
import { Button } from "@shared/ui/Button";
import { ConfirmDialog } from "@shared/ui/ConfirmDialog";

const badgeClassByPriority = {
  low: "story-badge story-badge-low",
  medium: "story-badge story-badge-medium",
  high: "story-badge story-badge-high",
} as const;

const badgeClassByStatus = {
  todo: "story-badge story-badge-todo",
  doing: "story-badge story-badge-doing",
  done: "story-badge story-badge-done",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storage = useMemo(() => new LocalStorageClient(), []);
  const projectsApi = useMemo(() => new ProjectsApi(storage), [storage]);
  const activeProjectApi = useMemo(() => new ActiveProjectApi(storage), [storage]);
  const storiesApi = useMemo(() => new StoriesApi(storage), [storage]);
  const currentUserManager = useMemo(() => new CurrentUserManager(), []);

  const [editing, setEditing] = useState<Story | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);

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

  const activeProject = useMemo(() => {
    const activeProjectId = activeProjectQuery.data;

    if (!activeProjectId) {
      return null;
    }

    return projectsQuery.data?.find(project => project.id === activeProjectId) ?? null;
  }, [activeProjectQuery.data, projectsQuery.data]);

  useEffect(() => {
    setEditing(null);
    setStoryToDelete(null);
  }, [activeProject?.id]);

  const storiesQuery = useQuery({
    queryKey: activeProject ? qk.stories(activeProject.id) : qk.storyList,
    queryFn: () => storiesApi.listByProject(activeProject!.id),
    enabled: Boolean(activeProject),
  });

  const createMutation = useMutation({
    mutationFn: async (data: StoryFormValues) => {
      if (!activeProject || !currentUserQuery.data) {
        throw new Error("An active project is required");
      }

      return storiesApi.create({
        ...data,
        project: activeProject.id,
        ownerId: currentUserQuery.data.id,
      });
    },
    onSuccess: async () => {
      if (activeProject) {
        await queryClient.invalidateQueries({ queryKey: qk.stories(activeProject.id) });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: StoryFormValues }) => {
      if (!activeProject || !currentUserQuery.data) {
        throw new Error("An active project is required");
      }

      return storiesApi.update(id, {
        ...data,
        project: activeProject.id,
        ownerId: currentUserQuery.data.id,
      });
    },
    onSuccess: async () => {
      if (activeProject) {
        await queryClient.invalidateQueries({ queryKey: qk.stories(activeProject.id) });
      }

      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => storiesApi.remove(id),
    onSuccess: async () => {
      if (activeProject) {
        await queryClient.invalidateQueries({ queryKey: qk.stories(activeProject.id) });
      }

      setStoryToDelete(null);
    },
  });

  const stories = storiesQuery.data ?? [];
  const currentUserName = currentUserQuery.data
    ? `${currentUserQuery.data.firstName} ${currentUserQuery.data.lastName}`
    : "Loading...";
  const isBusy =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const isWorkspaceLoading =
    currentUserQuery.isLoading || projectsQuery.isLoading || activeProjectQuery.isLoading;

  const sections = [
    {
      key: "doing",
      title: "Currently in progress",
      description: "Stories that are actively moving forward.",
      emptyText: "Nothing is in progress yet.",
      items: stories.filter(story => story.status === "doing"),
    },
    {
      key: "todo",
      title: "Waiting / To do",
      description: "Stories queued for the next steps.",
      emptyText: "No planned stories yet.",
      items: stories.filter(story => story.status === "todo"),
    },
    {
      key: "done",
      title: "Closed / Done",
      description: "Completed work that stays visible for reference.",
      emptyText: "No completed stories yet.",
      items: stories.filter(story => story.status === "done"),
    },
  ] as const;

  return (
    <div className="stack" style={{ gap: 18 }}>
      <header className="card stack" style={{ gap: 14 }}>
        <div className="row page-header-row">
          <div className="stack" style={{ gap: 6 }}>
            <h1 style={{ margin: 0 }}>Home</h1>
            <p className="muted page-lead">
              Keep the selected project focused, organized, and easy to move.
            </p>
          </div>

          <div className="page-actions">
            <Button type="button" onClick={() => navigate("/projects")}>
              Open projects
            </Button>
            {activeProject && <span className="pill pill-active">Selected project</span>}
          </div>
        </div>

        {activeProject ? (
          <div className="stack" style={{ gap: 14 }}>
            <div className="stack" style={{ gap: 6 }}>
              <div className="workspace-title">{activeProject.name}</div>
              <div className="muted">
                {activeProject.description || "No project description yet."}
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Stories</div>
                <div className="stat-value">{stories.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">In progress</div>
                <div className="stat-value">
                  {stories.filter(story => story.status === "doing").length}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Owner</div>
                <div className="stat-value stat-value-sm">{currentUserName}</div>
              </div>
            </div>
          </div>
        ) : isWorkspaceLoading ? (
          <div className="empty-state">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Loading workspace...</div>
            <div className="muted">Fetching your current project context.</div>
          </div>
        ) : projectsQuery.data?.length ? (
          <div className="empty-state">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>No active project selected</div>
            <div className="muted">
              Choose a project from the selector above or open the Projects page to start
              managing stories.
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>No projects yet</div>
            <div className="muted">
              Create a project on the Projects page before adding stories.
            </div>
          </div>
        )}
      </header>

      {activeProject && (
        <div className="two-col">
          <div className="stack sticky">
            <StoryForm
              initial={editing}
              onCancel={editing ? () => setEditing(null) : undefined}
              submitText={
                editing
                  ? updateMutation.isPending
                    ? "Saving..."
                    : "Update"
                  : createMutation.isPending
                    ? "Creating..."
                    : "Create"
              }
              onSubmit={async data => {
                if (editing) {
                  await updateMutation.mutateAsync({ id: editing.id, data });
                  return;
                }

                await createMutation.mutateAsync(data);
              }}
            />
          </div>

          <section className="stack" style={{ gap: 14 }}>
            {storiesQuery.isLoading && <div className="card">Loading stories...</div>}

            {storiesQuery.isError && (
              <div className="card" style={{ borderColor: "rgba(255,59,48,0.35)" }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Error loading stories</div>
                <div className="muted">Open the console for details.</div>
              </div>
            )}

            {!storiesQuery.isLoading && !storiesQuery.isError &&
              sections.map(section => (
                <section key={section.key} className="section-panel stack" style={{ gap: 12 }}>
                  <div className="section-panel-header">
                    <div>
                      <h2 style={{ margin: 0 }}>{section.title}</h2>
                      <div className="muted" style={{ marginTop: 6 }}>
                        {section.description}
                      </div>
                    </div>

                    <div className="section-count">{section.items.length}</div>
                  </div>

                  {section.items.length === 0 ? (
                    <div className="empty-state empty-state-compact">{section.emptyText}</div>
                  ) : (
                    <div className="stack" style={{ gap: 12 }}>
                      {section.items.map(story => (
                        <article key={story.id} className="story-card stack" style={{ gap: 12 }}>
                          <div className="story-card-header">
                            <div className="stack" style={{ gap: 6 }}>
                              <div style={{ fontWeight: 800, fontSize: 16 }}>{story.name}</div>
                              <div className="badge-row">
                                <span className={badgeClassByPriority[story.priority]}>
                                  {story.priority}
                                </span>
                                <span className={badgeClassByStatus[story.status]}>
                                  {story.status === "todo"
                                    ? "To do"
                                    : story.status === "doing"
                                      ? "In progress"
                                      : "Done"}
                                </span>
                              </div>
                            </div>

                            <div className="story-actions">
                              <Button
                                type="button"
                                onClick={() => setEditing(story)}
                                disabled={isBusy}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                onClick={() => setStoryToDelete(story)}
                                disabled={isBusy}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>

                          {story.description ? (
                            <div className="story-description">{story.description}</div>
                          ) : (
                            <div className="muted">No description</div>
                          )}

                          <div className="story-footer">
                            <div className="muted">Owner: {currentUserName}</div>
                            <div className="muted">Created {dateFormatter.format(story.createdAt)}</div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              ))}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(storyToDelete)}
        title={storyToDelete ? `Delete "${storyToDelete.name}"?` : "Delete story?"}
        description="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!storyToDelete) {
            return;
          }

          await deleteMutation.mutateAsync(storyToDelete.id);
        }}
        onCancel={() => {
          if (deleteMutation.isPending) {
            return;
          }

          setStoryToDelete(null);
        }}
      />
    </div>
  );
}


