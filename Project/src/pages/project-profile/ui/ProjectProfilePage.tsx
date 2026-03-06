import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import {
  ActiveProjectApi,
  PinnedProjectsApi,
  ProjectsApi,
  type ProjectCreateInput,
} from "@entities/project";
import { StoriesApi, type Story, type StoryFormValues } from "@entities/story";
import { CurrentUserManager } from "@entities/user";
import { ProjectForm } from "@features/project-form";
import { StoryForm } from "@features/story-form";
import { LocalStorageClient } from "@shared/api/localStorageClient";
import { qk } from "@shared/lib/queryKeys";
import { Button } from "@shared/ui/Button";
import { ConfirmDialog } from "@shared/ui/ConfirmDialog";
import { Input } from "@shared/ui/Input";
import { ModalDialog } from "@shared/ui/ModalDialog";

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

export function ProjectProfilePage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storage = useMemo(() => new LocalStorageClient(), []);
  const projectsApi = useMemo(() => new ProjectsApi(storage), [storage]);
  const activeProjectApi = useMemo(() => new ActiveProjectApi(storage), [storage]);
  const pinnedProjectsApi = useMemo(() => new PinnedProjectsApi(storage), [storage]);
  const storiesApi = useMemo(() => new StoriesApi(storage), [storage]);
  const currentUserManager = useMemo(() => new CurrentUserManager(), []);

  const [searchValue, setSearchValue] = useState("");
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);

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

  const project = useMemo(
    () => projectsQuery.data?.find(item => item.id === projectId) ?? null,
    [projectId, projectsQuery.data]
  );

  useEffect(() => {
    setSearchValue("");
    setEditingStory(null);
    setStoryToDelete(null);
    setIsCreateStoryOpen(false);
    setIsProjectDialogOpen(false);
    setIsDeleteProjectOpen(false);
  }, [project?.id]);

  useEffect(() => {
    if (!project || activeProjectQuery.data === project.id) {
      return;
    }

    let cancelled = false;

    void activeProjectApi.set(project.id).then(() => {
      if (cancelled) {
        return;
      }

      queryClient.setQueryData(qk.activeProject, project.id);
    });

    return () => {
      cancelled = true;
    };
  }, [activeProjectApi, activeProjectQuery.data, project, queryClient]);

  const storiesQuery = useQuery({
    queryKey: project ? qk.stories(project.id) : qk.storyList,
    queryFn: () => storiesApi.listByProject(project!.id),
    enabled: Boolean(project),
  });

  const createStoryMutation = useMutation({
    mutationFn: async (data: StoryFormValues) => {
      if (!project || !currentUserQuery.data) {
        throw new Error("A project is required");
      }

      return storiesApi.create({
        ...data,
        project: project.id,
        ownerId: currentUserQuery.data.id,
      });
    },
    onSuccess: async () => {
      if (project) {
        await queryClient.invalidateQueries({ queryKey: qk.stories(project.id) });
      }

      setIsCreateStoryOpen(false);
    },
  });

  const updateStoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: StoryFormValues }) => {
      if (!project || !currentUserQuery.data) {
        throw new Error("A project is required");
      }

      return storiesApi.update(id, {
        ...data,
        project: project.id,
        ownerId: currentUserQuery.data.id,
      });
    },
    onSuccess: async () => {
      if (project) {
        await queryClient.invalidateQueries({ queryKey: qk.stories(project.id) });
      }

      setEditingStory(null);
    },
  });

  const deleteStoryMutation = useMutation({
    mutationFn: (id: string) => storiesApi.remove(id),
    onSuccess: async () => {
      if (project) {
        await queryClient.invalidateQueries({ queryKey: qk.stories(project.id) });
      }

      setStoryToDelete(null);
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: (data: ProjectCreateInput) => projectsApi.update(projectId, data),
    onSuccess: async updatedProject => {
      await queryClient.invalidateQueries({ queryKey: qk.projects });
      queryClient.setQueryData(qk.activeProject, updatedProject.id);
      setIsProjectDialogOpen(false);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      if (!project) {
        throw new Error("Project not found");
      }

      await projectsApi.remove(project.id);
      await storiesApi.removeByProject(project.id);
      const pinnedProjectIds = await pinnedProjectsApi.remove(project.id);

      const activeProjectId = await activeProjectApi.get();
      if (activeProjectId === project.id) {
        await activeProjectApi.set(null);
      }

      return pinnedProjectIds;
    },
    onSuccess: async pinnedProjectIds => {
      queryClient.setQueryData(qk.pinnedProjects, pinnedProjectIds);
      await queryClient.invalidateQueries({ queryKey: qk.projects });
      await queryClient.invalidateQueries({ queryKey: qk.activeProject });
      await queryClient.invalidateQueries({ queryKey: qk.storyList });

      if (project) {
        await queryClient.invalidateQueries({ queryKey: qk.stories(project.id) });
      }

      setIsDeleteProjectOpen(false);
      navigate("/projects");
    },
  });

  const stories = storiesQuery.data ?? [];
  const searchTerm = searchValue.trim().toLowerCase();
  const filteredStories = useMemo(() => {
    if (!searchTerm) {
      return stories;
    }

    return stories.filter(story => {
      const description = story.description ?? "";

      return (
        story.name.toLowerCase().includes(searchTerm) ||
        description.toLowerCase().includes(searchTerm)
      );
    });
  }, [searchTerm, stories]);
  const currentUserName = currentUserQuery.data
    ? `${currentUserQuery.data.firstName} ${currentUserQuery.data.lastName}`
    : "Loading...";
  const historyCountLabel = searchTerm
    ? `${filteredStories.length} of ${stories.length} items`
    : filteredStories.length === 1
      ? "1 item"
      : `${filteredStories.length} items`;
  const isStoryDialogOpen = isCreateStoryOpen || Boolean(editingStory);
  const isBusy =
    createStoryMutation.isPending ||
    updateStoryMutation.isPending ||
    deleteStoryMutation.isPending ||
    updateProjectMutation.isPending ||
    deleteProjectMutation.isPending;

  const sections = [
    {
      key: "doing",
      title: "Currently in progress",
      description: "History items that are actively moving forward.",
      emptyText: "Nothing is in progress yet.",
      items: filteredStories.filter(story => story.status === "doing"),
    },
    {
      key: "todo",
      title: "Waiting / To do",
      description: "History items queued for the next steps.",
      emptyText: "No planned history items yet.",
      items: filteredStories.filter(story => story.status === "todo"),
    },
    {
      key: "done",
      title: "Closed / Done",
      description: "Completed work that stays visible for reference.",
      emptyText: "No completed history items yet.",
      items: filteredStories.filter(story => story.status === "done"),
    },
  ] as const;

  function openCreateStoryDialog() {
    setEditingStory(null);
    setIsCreateStoryOpen(true);
  }

  function closeStoryDialog() {
    if (createStoryMutation.isPending || updateStoryMutation.isPending) {
      return;
    }

    setIsCreateStoryOpen(false);
    setEditingStory(null);
  }

  if (projectsQuery.isLoading) {
    return <div className="card">Loading project profile...</div>;
  }

  if (!project) {
    return (
      <div className="stack" style={{ gap: 18 }}>
        <div>
          <Button type="button" onClick={() => navigate("/projects")}>
            Back to projects
          </Button>
        </div>

        <div className="empty-state empty-state-centered">
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Project not found</div>
          <div className="muted">
            The project may have been deleted or the link is no longer valid.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 18 }}>
      <section className="profile-top-grid">
        <header className="card stack project-profile-card" style={{ gap: 18 }}>
          <div className="row page-header-row">
            <Button type="button" onClick={() => navigate("/projects")}>
              Back
            </Button>

            <div className="page-actions">
              <Button
                type="button"
                onClick={() => setIsProjectDialogOpen(true)}
                disabled={isBusy}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => setIsDeleteProjectOpen(true)}
                disabled={isBusy}
              >
                Delete
              </Button>
            </div>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <span className="eyebrow">Project profile</span>
            <h1 style={{ margin: 0 }}>{project.name}</h1>
            <p className="muted page-lead project-summary-copy">
              {project.description || "No project description yet."}
            </p>
          </div>

          <div className="stats-grid stats-grid-wide">
            <div className="stat-card">
              <div className="stat-label">History items</div>
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
            <div className="stat-card">
              <div className="stat-label">Updated</div>
              <div className="stat-value stat-value-sm">{dateFormatter.format(project.updatedAt)}</div>
            </div>
          </div>
        </header>

        <section className="card stack project-history-card" style={{ gap: 16 }}>
          <div className="row page-header-row">
            <div className="stack" style={{ gap: 6 }}>
              <span className="eyebrow">History</span>
              <h2 style={{ margin: 0 }}>Project history</h2>
              <p className="muted page-lead">
                Search, add, and manage the history items inside this project.
              </p>
            </div>

            <Button
              type="button"
              className="history-add-btn"
              onClick={openCreateStoryDialog}
              disabled={isBusy || currentUserQuery.isLoading}
            >
              Add new
            </Button>
          </div>

          <div className="projects-toolbar">
            <Input
              value={searchValue}
              onChange={event => setSearchValue(event.target.value)}
              placeholder="Search history"
              aria-label="Search project history"
            />
            <div className="muted projects-toolbar-meta">{historyCountLabel}</div>
          </div>
        </section>
      </section>

      <section className="story-section-grid">
        {storiesQuery.isLoading && <div className="card story-section-span">Loading history...</div>}

        {storiesQuery.isError && (
          <div className="card story-section-span" style={{ borderColor: "rgba(255,59,48,0.35)" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Error loading history</div>
            <div className="muted">Open the console for details.</div>
          </div>
        )}

        {!storiesQuery.isLoading && !storiesQuery.isError && stories.length === 0 && (
          <div className="empty-state empty-state-centered story-section-span">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>No history yet</div>
            <div className="muted" style={{ marginBottom: 14 }}>
              Add the first history item for this project.
            </div>
            <div>
              <Button
              type="button"
              className="history-add-btn"
              onClick={openCreateStoryDialog}
              disabled={isBusy || currentUserQuery.isLoading}
            >
                Add new
              </Button>
            </div>
          </div>
        )}

        {!storiesQuery.isLoading && !storiesQuery.isError &&
          stories.length > 0 &&
          filteredStories.length === 0 && (
            <div className="empty-state empty-state-centered story-section-span">
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Nothing found</div>
              <div className="muted" style={{ marginBottom: 14 }}>
                No history item matches "{searchValue}".
              </div>
              <div>
                <Button type="button" onClick={() => setSearchValue("")}>
                  Clear search
                </Button>
              </div>
            </div>
          )}

        {!storiesQuery.isLoading && !storiesQuery.isError && filteredStories.length > 0 &&
          sections.map(section => (
            <section key={section.key} className="section-panel stack story-status-panel" style={{ gap: 12 }}>
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
                            onClick={() => setEditingStory(story)}
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

      <ModalDialog
        open={isStoryDialogOpen}
        onClose={closeStoryDialog}
        ariaLabel={editingStory ? "Edit history item" : "Create history item"}
      >
        <StoryForm
          initial={editingStory}
          surface="plain"
          submitText={
            editingStory
              ? updateStoryMutation.isPending
                ? "Saving..."
                : "Save changes"
              : createStoryMutation.isPending
                ? "Creating..."
                : "Create history item"
          }
          onCancel={closeStoryDialog}
          onSubmit={async data => {
            if (editingStory) {
              await updateStoryMutation.mutateAsync({ id: editingStory.id, data });
              return;
            }

            await createStoryMutation.mutateAsync(data);
          }}
        />
      </ModalDialog>

      <ModalDialog
        open={isProjectDialogOpen}
        onClose={() => {
          if (updateProjectMutation.isPending) {
            return;
          }

          setIsProjectDialogOpen(false);
        }}
        ariaLabel="Edit project"
      >
        <ProjectForm
          initial={project}
          surface="plain"
          submitText={updateProjectMutation.isPending ? "Saving..." : "Save changes"}
          onCancel={() => {
            if (updateProjectMutation.isPending) {
              return;
            }

            setIsProjectDialogOpen(false);
          }}
          onSubmit={async data => {
            await updateProjectMutation.mutateAsync(data);
          }}
        />
      </ModalDialog>

      <ConfirmDialog
        open={Boolean(storyToDelete)}
        title={storyToDelete ? `Delete "${storyToDelete.name}"?` : "Delete story?"}
        description="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger
        loading={deleteStoryMutation.isPending}
        onConfirm={async () => {
          if (!storyToDelete) {
            return;
          }

          await deleteStoryMutation.mutateAsync(storyToDelete.id);
        }}
        onCancel={() => {
          if (deleteStoryMutation.isPending) {
            return;
          }

          setStoryToDelete(null);
        }}
      />

      <ConfirmDialog
        open={isDeleteProjectOpen}
        title={`Delete "${project.name}"?`}
        description="This action removes the project and all of its stories. Are you sure you want to delete it?"
        confirmText="Delete"
        cancelText="Cancel"
        danger
        loading={deleteProjectMutation.isPending}
        onConfirm={async () => {
          await deleteProjectMutation.mutateAsync();
        }}
        onCancel={() => {
          if (deleteProjectMutation.isPending) {
            return;
          }

          setIsDeleteProjectOpen(false);
        }}
      />
    </div>
  );
}


