import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { ActiveProjectApi, ProjectsApi } from "@entities/project";
import { StoriesApi } from "@entities/story";
import { TasksApi, type Task, type TaskCreateInput } from "@entities/task";
import { CurrentUserManager, UsersApi } from "@entities/user";
import { TaskForm } from "@features/task-form";
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

const statusLabel = {
  todo: "To do",
  doing: "In progress",
  done: "Done",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const hoursFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 2,
});

function formatUserName(firstName?: string, lastName?: string) {
  if (!firstName || !lastName) {
    return "Unknown user";
  }

  return `${firstName} ${lastName}`;
}

function formatHours(hours: number) {
  return `${hoursFormatter.format(hours)}h`;
}

export function StoryProfilePage() {
  const { projectId = "", storyId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storage = useMemo(() => new LocalStorageClient(), []);
  const projectsApi = useMemo(() => new ProjectsApi(storage), [storage]);
  const activeProjectApi = useMemo(() => new ActiveProjectApi(storage), [storage]);
  const storiesApi = useMemo(() => new StoriesApi(storage), [storage]);
  const tasksApi = useMemo(() => new TasksApi(storage), [storage]);
  const currentUserManager = useMemo(() => new CurrentUserManager(), []);
  const usersApi = useMemo(() => new UsersApi(), []);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const projectsQuery = useQuery({
    queryKey: qk.projects,
    queryFn: () => projectsApi.list(),
  });

  const project = useMemo(
    () => projectsQuery.data?.find(item => item.id === projectId) ?? null,
    [projectId, projectsQuery.data]
  );

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

  const usersQuery = useQuery({
    queryKey: qk.users,
    queryFn: () => usersApi.list(),
  });

  const currentUserQuery = useQuery({
    queryKey: qk.currentUser,
    queryFn: () => currentUserManager.getCurrentUser(),
  });

  useEffect(() => {
    if (!project) {
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
  }, [activeProjectApi, project, queryClient]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSearchValue("");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [storyId]);

  const story = useMemo(
    () => storiesQuery.data?.find(item => item.id === storyId) ?? null,
    [storiesQuery.data, storyId]
  );
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const storyTasks = useMemo(
    () => tasks.filter(task => task.storyId === storyId),
    [storyId, tasks]
  );
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const usersById = useMemo(() => new Map(users.map(user => [user.id, user])), [users]);
  const storyCreator = story?.ownerId ? usersById.get(story.ownerId) : null;

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskCreateInput) => {
      const currentUser = await currentUserManager.getCurrentUser();

      return tasksApi.create({
        ...data,
        createdById: currentUser?.id ?? null,
      });
    },
    onSuccess: async () => {
      if (project) {
        await queryClient.invalidateQueries({ queryKey: qk.tasks(project.id) });
        await queryClient.invalidateQueries({ queryKey: qk.stories(project.id) });
      }

      setIsCreateTaskOpen(false);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TaskCreateInput }) =>
      tasksApi.update(id, data),
    onSuccess: async updatedTask => {
      if (project) {
        await queryClient.invalidateQueries({ queryKey: qk.tasks(project.id) });
        await queryClient.invalidateQueries({ queryKey: qk.stories(project.id) });
      }

      queryClient.setQueryData(qk.task(updatedTask.id), updatedTask);
      setEditingTask(null);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (task: Task) => tasksApi.remove(task.id),
    onSuccess: async (_, task) => {
      if (project) {
        await queryClient.invalidateQueries({ queryKey: qk.tasks(project.id) });
        await queryClient.invalidateQueries({ queryKey: qk.stories(project.id) });
      }

      queryClient.removeQueries({ queryKey: qk.task(task.id) });
      setTaskToDelete(null);
    },
  });

  const isTaskDialogOpen = isCreateTaskOpen || Boolean(editingTask);
  const isBusy =
    createTaskMutation.isPending ||
    updateTaskMutation.isPending ||
    deleteTaskMutation.isPending;
  const searchTerm = searchValue.trim().toLowerCase();
  const filteredTasks = useMemo(() => {
    if (!searchTerm) {
      return storyTasks;
    }

    return storyTasks.filter(task => {
      const description = task.description ?? "";

      return (
        task.name.toLowerCase().includes(searchTerm) ||
        description.toLowerCase().includes(searchTerm)
      );
    });
  }, [searchTerm, storyTasks]);
  const taskCountLabel = searchTerm
    ? `${filteredTasks.length} of ${storyTasks.length} tasks`
    : storyTasks.length === 1
      ? "1 task"
      : `${storyTasks.length} tasks`;

  const taskColumns = [
    {
      key: "todo",
      title: "To do",
      description: "Tasks waiting for assignment or start.",
      emptyText: "No tasks waiting to start.",
      items: filteredTasks.filter(task => task.status === "todo"),
    },
    {
      key: "doing",
      title: "Doing",
      description: "Tasks currently assigned and in progress.",
      emptyText: "No active tasks right now.",
      items: filteredTasks.filter(task => task.status === "doing"),
    },
    {
      key: "done",
      title: "Done",
      description: "Tasks that were completed and closed.",
      emptyText: "No completed tasks yet.",
      items: filteredTasks.filter(task => task.status === "done"),
    },
  ] as const;

  function getUserName(userId: string | null) {
    if (!userId) {
      return "Unassigned";
    }

    const user = usersById.get(userId);
    return user ? formatUserName(user.firstName, user.lastName) : "Unknown user";
  }

  function openCreateTaskDialog() {
    setEditingTask(null);
    setIsCreateTaskOpen(true);
  }

  function closeTaskDialog() {
    if (createTaskMutation.isPending || updateTaskMutation.isPending) {
      return;
    }

    setIsCreateTaskOpen(false);
    setEditingTask(null);
  }

  if (
    projectsQuery.isLoading ||
    (project && storiesQuery.isLoading) ||
    (project && tasksQuery.isLoading) ||
    usersQuery.isLoading ||
    currentUserQuery.isLoading
  ) {
    return <div className="card">Loading story profile...</div>;
  }

  if (
    projectsQuery.isError ||
    storiesQuery.isError ||
    tasksQuery.isError ||
    usersQuery.isError ||
    currentUserQuery.isError
  ) {
    return (
      <div className="stack" style={{ gap: 18 }}>
        <div>
          <Button
            type="button"
            onClick={() => (projectId ? navigate(`/projects/${projectId}`) : navigate("/projects"))}
          >
            Back
          </Button>
        </div>

        <div className="card" style={{ borderColor: "rgba(255,59,48,0.35)" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Error loading story profile</div>
          <div className="muted">Open the console for details.</div>
        </div>
      </div>
    );
  }

  if (!project || !story) {
    return (
      <div className="stack" style={{ gap: 18 }}>
        <div>
          <Button
            type="button"
            onClick={() => (project ? navigate(`/projects/${project.id}`) : navigate("/projects"))}
          >
            Back
          </Button>
        </div>

        <div className="empty-state empty-state-centered">
          <div style={{ fontWeight: 800, marginBottom: 6 }}>History profile not found</div>
          <div className="muted">
            The story may have been deleted or the link no longer matches this project.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 18 }}>
      <section className="profile-top-grid">
        <header className="card stack project-profile-card story-profile-hero" style={{ gap: 18 }}>
          <div className="row page-header-row">
            <Button type="button" onClick={() => navigate(`/projects/${project.id}`)}>
              Back to project
            </Button>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <span className="eyebrow">Story profile</span>
            <h1 style={{ margin: 0 }}>{story.name}</h1>
            <div className="badge-row">
              <span className={badgeClassByPriority[story.priority]}>{story.priority}</span>
              <span className={badgeClassByStatus[story.status]}>
                {statusLabel[story.status]}
              </span>
            </div>
            <p className="muted page-lead project-summary-copy">
              {story.description || "No story description yet."}
            </p>
          </div>

          <div className="stats-grid stats-grid-wide">
            <div className="stat-card">
              <div className="stat-label">Project</div>
              <div className="stat-value stat-value-sm">{project.name}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Created by</div>
              <div className="stat-value stat-value-sm">
                {storyCreator
                  ? formatUserName(storyCreator.firstName, storyCreator.lastName)
                  : "Unknown user"}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Tasks</div>
              <div className="stat-value">{storyTasks.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">In progress tasks</div>
              <div className="stat-value">
                {storyTasks.filter(task => task.status === "doing").length}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Created</div>
              <div className="stat-value stat-value-sm">
                {dateFormatter.format(story.createdAt)}
              </div>
            </div>
          </div>
        </header>
      </section>

      <section className="card stack" style={{ gap: 16 }}>
        <div className="row page-header-row">
          <div className="stack" style={{ gap: 6 }}>
            <span className="eyebrow">Kanban</span>
            <h2 style={{ margin: 0 }}>Task board</h2>
            <p className="muted page-lead">
              Follow the work inside this history item and open task details when you
              need to assign, start, or close a task.
            </p>
          </div>

          <Button
            type="button"
            className="history-add-btn"
            onClick={openCreateTaskDialog}
            disabled={isBusy || currentUserQuery.isLoading}
          >
            Add task
          </Button>
        </div>

        <div className="projects-toolbar">
          <Input
            value={searchValue}
            onChange={event => setSearchValue(event.target.value)}
            placeholder="Search tasks"
            aria-label="Search story tasks"
          />
          <div className="muted projects-toolbar-meta">{taskCountLabel}</div>
        </div>

        <div className="story-section-grid">
          {storyTasks.length === 0 && (
            <div className="empty-state empty-state-centered story-section-span">
              <div style={{ fontWeight: 800, marginBottom: 6 }}>No tasks yet</div>
              <div className="muted" style={{ marginBottom: 14 }}>
                Add the first task to start organizing the work inside this history item.
              </div>
              <div>
                <Button
                  type="button"
                  className="history-add-btn"
                  onClick={openCreateTaskDialog}
                  disabled={isBusy || currentUserQuery.isLoading}
                >
                  Add task
                </Button>
              </div>
            </div>
          )}

          {storyTasks.length > 0 && filteredTasks.length === 0 && (
            <div className="empty-state empty-state-centered story-section-span">
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Nothing found</div>
              <div className="muted" style={{ marginBottom: 14 }}>
                No task matches "{searchValue}".
              </div>
              <div>
                <Button type="button" onClick={() => setSearchValue("")}>
                  Clear search
                </Button>
              </div>
            </div>
          )}

          {filteredTasks.length > 0 &&
            taskColumns.map(column => (
              <section
                key={column.key}
                className="section-panel stack story-status-panel"
                style={{ gap: 12 }}
              >
                <div className="section-panel-header">
                  <div>
                    <h2 style={{ margin: 0 }}>{column.title}</h2>
                    <div className="muted" style={{ marginTop: 6 }}>
                      {column.description}
                    </div>
                  </div>

                  <div className="section-count">{column.items.length}</div>
                </div>

                {column.items.length === 0 ? (
                  <div className="empty-state empty-state-compact">{column.emptyText}</div>
                ) : (
                  <div className="stack" style={{ gap: 12 }}>
                    {column.items.map(task => (
                      <article key={task.id} className="story-card stack" style={{ gap: 12 }}>
                        <div className="story-card-header">
                          <div className="stack" style={{ gap: 6 }}>
                            <div style={{ fontWeight: 800, fontSize: 16 }}>{task.name}</div>
                            <div className="badge-row">
                              <span className={badgeClassByPriority[task.priority]}>
                                {task.priority}
                              </span>
                              <span className={badgeClassByStatus[task.status]}>
                                {statusLabel[task.status]}
                              </span>
                            </div>
                          </div>

                          <div className="story-actions story-actions-compact">
                            <Button
                              type="button"
                              className="icon-circle-btn"
                              aria-label="Open task details"
                              onClick={() =>
                                navigate(`/projects/${project.id}/tasks/${task.id}`)
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
                              aria-label="Edit task"
                              onClick={() => setEditingTask(task)}
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
                              aria-label="Delete task"
                              onClick={() => setTaskToDelete(task)}
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

                        {task.description ? (
                          <div className="story-description">{task.description}</div>
                        ) : (
                          <div className="muted">No description</div>
                        )}

                        <div className="story-footer">
                          <div className="muted">Estimate: {formatHours(task.estimatedHours)}</div>
                          <div className="muted">Assigned to: {getUserName(task.assigneeId)}</div>
                          <div className="muted">Created by: {getUserName(task.createdById ?? null)}</div>
                          <div className="muted">Created {dateFormatter.format(task.createdAt)}</div>
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
        open={isTaskDialogOpen}
        onClose={closeTaskDialog}
        ariaLabel={editingTask ? "Edit task" : "Create task"}
      >
        <TaskForm
          key={editingTask?.id ?? `create-task-${story.id}`}
          initial={editingTask}
          stories={[story]}
          surface="plain"
          submitText={
            editingTask
              ? updateTaskMutation.isPending
                ? "Saving..."
                : "Save changes"
              : createTaskMutation.isPending
                ? "Creating..."
                : "Create task"
          }
          onCancel={closeTaskDialog}
          onSubmit={async data => {
            if (editingTask) {
              await updateTaskMutation.mutateAsync({ id: editingTask.id, data });
              return;
            }

            await createTaskMutation.mutateAsync(data);
          }}
        />
      </ModalDialog>

      <ConfirmDialog
        open={Boolean(taskToDelete)}
        title={taskToDelete ? `Delete "${taskToDelete.name}"?` : "Delete task?"}
        description="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger
        loading={deleteTaskMutation.isPending}
        onConfirm={async () => {
          if (!taskToDelete) {
            return;
          }

          await deleteTaskMutation.mutateAsync(taskToDelete);
        }}
        onCancel={() => {
          if (deleteTaskMutation.isPending) {
            return;
          }

          setTaskToDelete(null);
        }}
      />
    </div>
  );
}
