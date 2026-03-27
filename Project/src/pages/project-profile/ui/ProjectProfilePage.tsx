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
import { TasksApi } from "@entities/task";
import { CurrentUserManager, UsersApi } from "@entities/user";
import { ProjectForm } from "@features/project-form";
import { StoryForm } from "@features/story-form";
import { LocalStorageClient } from "@shared/api/localStorageClient";
import { qk } from "@shared/lib/queryKeys";
import { Button } from "@shared/ui/Button";
import { ConfirmDialog } from "@shared/ui/ConfirmDialog";
import { Input } from "@shared/ui/Input";
import { ModalDialog } from "@shared/ui/ModalDialog";
import { EmptyState, ErrorCard, LoadingCard } from "@shared/ui/PageState";
import { PriorityBadge, StatusBadge } from "@shared/ui/WorkItemBadge";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatUserName(firstName?: string, lastName?: string) {
  if (!firstName || !lastName) {
    return "Unknown user";
  }

  return `${firstName} ${lastName}`;
}

export function ProjectProfilePage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storage = useMemo(() => new LocalStorageClient(), []);
  const projectsApi = useMemo(() => new ProjectsApi(storage), [storage]);
  const activeProjectApi = useMemo(() => new ActiveProjectApi(storage), [storage]);
  const pinnedProjectsApi = useMemo(() => new PinnedProjectsApi(storage), [storage]);
  const storiesApi = useMemo(() => new StoriesApi(storage), [storage]);
  const tasksApi = useMemo(() => new TasksApi(storage), [storage]);
  const currentUserManager = useMemo(() => new CurrentUserManager(), []);
  const usersApi = useMemo(() => new UsersApi(), []);

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

  const usersQuery = useQuery({
    queryKey: qk.users,
    queryFn: () => usersApi.list(),
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
    /* eslint-disable react-hooks/set-state-in-effect */
    setSearchValue("");
    setEditingStory(null);
    setStoryToDelete(null);
    setIsCreateStoryOpen(false);
    setIsProjectDialogOpen(false);
    setIsDeleteProjectOpen(false);
    /* eslint-enable react-hooks/set-state-in-effect */
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

  const tasksQuery = useQuery({
    queryKey: project ? qk.tasks(project.id) : qk.taskList,
    queryFn: () => tasksApi.listByProject(project!.id),
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
    mutationFn: async (story: Story) => {
      await tasksApi.removeByStory(story.id);
      await storiesApi.remove(story.id);
    },
    onSuccess: async () => {
      if (project) {
        await queryClient.invalidateQueries({ queryKey: qk.stories(project.id) });
        await queryClient.invalidateQueries({ queryKey: qk.tasks(project.id) });
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

      await tasksApi.removeByProject(project.id);
      await storiesApi.removeByProject(project.id);
      await projectsApi.remove(project.id);
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
      await queryClient.invalidateQueries({ queryKey: qk.taskList });

      if (project) {
        await queryClient.invalidateQueries({ queryKey: qk.stories(project.id) });
        await queryClient.invalidateQueries({ queryKey: qk.tasks(project.id) });
      }

      setIsDeleteProjectOpen(false);
      navigate("/projects");
    },
  });

  const stories = useMemo(() => storiesQuery.data ?? [], [storiesQuery.data]);
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const usersById = useMemo(() => new Map(users.map(user => [user.id, user])), [users]);
  const taskCountByStoryId = useMemo(() => {
    const counts = new Map<string, number>();

    tasks.forEach(task => {
      counts.set(task.storyId, (counts.get(task.storyId) ?? 0) + 1);
    });

    return counts;
  }, [tasks]);

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

  const storySections = [
    {
      key: "todo",
      title: "Waiting / To do",
      description: "History items queued for the next steps.",
      emptyText: "No planned history items yet.",
      items: filteredStories.filter(story => story.status === "todo"),
    },
    {
      key: "doing",
      title: "Currently in progress",
      description: "History items that are actively moving forward.",
      emptyText: "Nothing is in progress yet.",
      items: filteredStories.filter(story => story.status === "doing"),
    },
    {
      key: "done",
      title: "Closed / Done",
      description: "Completed work that stays visible for reference.",
      emptyText: "No completed history items yet.",
      items: filteredStories.filter(story => story.status === "done"),
    },
  ] as const;

  function getUserName(userId: string | null) {
    if (!userId) {
      return "Unassigned";
    }

    const user = usersById.get(userId);
    return user ? formatUserName(user.firstName, user.lastName) : "Unknown user";
  }

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
    return <LoadingCard text="Loading project profile..." />;
  }

  if (!project) {
    return (
      <div className="stack gap-[18px]">
        <div>
          <Button type="button" onClick={() => navigate("/projects")}>
            Back to projects
          </Button>
        </div>

        <EmptyState
          title="Project not found"
          description="The project may have been deleted or the link is no longer valid."
        />
      </div>
    );
  }

  return (
    <div className="stack gap-[18px]">
      <section className="profile-top-grid">
        <header className="card stack project-profile-card story-profile-hero gap-[18px]">
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

          <div className="stack gap-2">
            <span className="eyebrow">Project profile</span>
            <h1 className="m-0">{project.name}</h1>
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
              <div className="stat-label">Tasks</div>
              <div className="stat-value">{tasks.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">In progress tasks</div>
              <div className="stat-value">
                {tasks.filter(task => task.status === "doing").length}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Updated</div>
              <div className="stat-value stat-value-sm">
                {dateFormatter.format(project.updatedAt)}
              </div>
            </div>
          </div>
        </header>
      </section>

      <section className="card stack gap-4">
        <div className="row page-header-row">
          <div className="stack gap-1.5">
            <span className="eyebrow">Kanban</span>
            <h2 className="m-0">History board</h2>
            <p className="muted page-lead">
              Follow the project history by status, search items quickly, and open each
              story profile when you need task details.
            </p>
          </div>

          <Button
            type="button"
            className="history-add-btn"
            onClick={openCreateStoryDialog}
            disabled={isBusy || currentUserQuery.isLoading}
          >
            Add story
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

        <div className="story-section-grid">
          {storiesQuery.isLoading && (
            <LoadingCard text="Loading history..." className="story-section-span" />
          )}

          {storiesQuery.isError && (
            <ErrorCard title="Error loading history" className="story-section-span" />
          )}

          {!storiesQuery.isLoading && !storiesQuery.isError && stories.length === 0 && (
            <EmptyState
              title="No history yet"
              description="Add the first history item for this project."
              className="story-section-span"
              action={
                <Button
                  type="button"
                  className="history-add-btn"
                  onClick={openCreateStoryDialog}
                  disabled={isBusy || currentUserQuery.isLoading}
                >
                  Add story
                </Button>
              }
            />
          )}

        {!storiesQuery.isLoading &&
            !storiesQuery.isError &&
            stories.length > 0 &&
            filteredStories.length === 0 && (
              <EmptyState
                title="Nothing found"
                description={`No history item matches "${searchValue}".`}
                className="story-section-span"
                action={
                  <Button type="button" onClick={() => setSearchValue("")}>
                    Clear search
                  </Button>
                }
              />
            )}

          {!storiesQuery.isLoading &&
            !storiesQuery.isError &&
            filteredStories.length > 0 &&
            storySections.map(section => (
              <section
                key={section.key}
                className="section-panel stack story-status-panel gap-3"
              >
                <div className="section-panel-header">
                  <div>
                    <h2 className="m-0">{section.title}</h2>
                    <div className="muted mt-1.5">
                      {section.description}
                    </div>
                  </div>

                  <div className="section-count">{section.items.length}</div>
                </div>

                {section.items.length === 0 ? (
                  <div className="empty-state empty-state-compact">{section.emptyText}</div>
                ) : (
                  <div className="stack gap-3">
                    {section.items.map(story => (
                      <article key={story.id} className="story-card stack gap-3">
                        <div className="story-card-header">
                          <div className="stack gap-1.5">
                            <div className="text-[16px] font-extrabold">{story.name}</div>
                            <div className="badge-row">
                              <PriorityBadge value={story.priority} />
                              <StatusBadge value={story.status} />
                            </div>
                          </div>

                          <div className="story-actions story-actions-compact">
                            <Button
                              type="button"
                              className="icon-circle-btn"
                              aria-label="Open story profile"
                              onClick={() =>
                                navigate(`/projects/${project.id}/stories/${story.id}`)
                              }
                              disabled={isBusy}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Zm9 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                                  fill="currentColor"
                                />
                              </svg>
                            </Button>
                            <Button
                              type="button"
                              className="icon-circle-btn"
                              aria-label="Edit story"
                              onClick={() => setEditingStory(story)}
                              disabled={isBusy}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="m4 16.75 9.95-9.95 3.25 3.25L7.25 20H4v-3.25Zm11.4-11.4 1.1-1.1a1.5 1.5 0 0 1 2.12 0l1.13 1.13a1.5 1.5 0 0 1 0 2.12l-1.1 1.1-3.25-3.25Z"
                                  fill="currentColor"
                                />
                              </svg>
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              className="icon-circle-btn"
                              aria-label="Delete story"
                              onClick={() => setStoryToDelete(story)}
                              disabled={isBusy}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 8h10l-.7 11.1A2 2 0 0 1 14.3 21H9.7a2 2 0 0 1-1.99-1.9L7 8Z"
                                  fill="currentColor"
                                />
                              </svg>
                            </Button>
                          </div>
                        </div>

                        {story.description ? (
                          <div className="story-description">{story.description}</div>
                        ) : (
                          <div className="muted">No description</div>
                        )}

                        <div className="story-footer">
                          <div className="muted">Owner: {getUserName(story.ownerId)}</div>
                          <div className="muted">Tasks: {taskCountByStoryId.get(story.id) ?? 0}</div>
                          <div className="muted">Created {dateFormatter.format(story.createdAt)}</div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ))}
        </div>
      </section>

      <ModalDialog
        open={isStoryDialogOpen}
        onClose={closeStoryDialog}
        ariaLabel={editingStory ? "Edit history item" : "Create history item"}
      >
        <StoryForm
          key={editingStory?.id ?? "create-story"}
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
          key={project.id}
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
        description="This action cannot be undone and also removes every task linked to this history item."
        confirmText="Delete"
        cancelText="Cancel"
        danger
        loading={deleteStoryMutation.isPending}
        onConfirm={async () => {
          if (!storyToDelete) {
            return;
          }

          await deleteStoryMutation.mutateAsync(storyToDelete);
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
        description="This action removes the project together with all stories and tasks. Are you sure you want to delete it?"
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
