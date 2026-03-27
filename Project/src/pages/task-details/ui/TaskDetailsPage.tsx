import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { ActiveProjectApi, ProjectsApi } from "@entities/project";
import { StoriesApi } from "@entities/story";
import { TasksApi } from "@entities/task";
import { UsersApi } from "@entities/user";
import { LocalStorageClient } from "@shared/api/localStorageClient";
import { qk } from "@shared/lib/queryKeys";
import { workItemStatusLabel } from "@shared/lib/workItemPresentation";
import { Button } from "@shared/ui/Button";
import { EmptyState, LoadingCard } from "@shared/ui/PageState";
import { Select } from "@shared/ui/Select";
import { PriorityBadge, StatusBadge } from "@shared/ui/WorkItemBadge";

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

export function TaskDetailsPage() {
  const { projectId = "", taskId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storage = useMemo(() => new LocalStorageClient(), []);
  const projectsApi = useMemo(() => new ProjectsApi(storage), [storage]);
  const activeProjectApi = useMemo(() => new ActiveProjectApi(storage), [storage]);
  const storiesApi = useMemo(() => new StoriesApi(storage), [storage]);
  const tasksApi = useMemo(() => new TasksApi(storage), [storage]);
  const usersApi = useMemo(() => new UsersApi(), []);

  const [assigneeOverrideId, setAssigneeOverrideId] = useState<string | null>(null);

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

  const taskQuery = useQuery({
    queryKey: qk.task(taskId),
    queryFn: () => tasksApi.getById(taskId),
    enabled: Boolean(taskId),
  });

  const usersQuery = useQuery({
    queryKey: qk.users,
    queryFn: () => usersApi.list(),
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

  const task = taskQuery.data;
  const story = useMemo(
    () => storiesQuery.data?.find(item => item.id === task?.storyId) ?? null,
    [storiesQuery.data, task?.storyId]
  );
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const assignableUsers = useMemo(
    () => users.filter(user => user.role !== "admin"),
    [users]
  );
  const usersById = useMemo(
    () => new Map(users.map(user => [user.id, user])),
    [users]
  );

  const assignUserMutation = useMutation({
    mutationFn: (assigneeId: string) => tasksApi.assignUser(taskId, assigneeId),
    onSuccess: async updatedTask => {
      queryClient.setQueryData(qk.task(updatedTask.id), updatedTask);

      if (project) {
        await queryClient.invalidateQueries({ queryKey: qk.tasks(project.id) });
        await queryClient.invalidateQueries({ queryKey: qk.stories(project.id) });
      }
    },
  });

  const startTaskMutation = useMutation({
    mutationFn: (assigneeId: string) => tasksApi.startTask(taskId, assigneeId),
    onSuccess: async updatedTask => {
      queryClient.setQueryData(qk.task(updatedTask.id), updatedTask);

      if (project) {
        await queryClient.invalidateQueries({ queryKey: qk.tasks(project.id) });
        await queryClient.invalidateQueries({ queryKey: qk.stories(project.id) });
      }
    },
  });

  const markDoneMutation = useMutation({
    mutationFn: () => tasksApi.markDone(taskId),
    onSuccess: async updatedTask => {
      queryClient.setQueryData(qk.task(updatedTask.id), updatedTask);

      if (project) {
        await queryClient.invalidateQueries({ queryKey: qk.tasks(project.id) });
        await queryClient.invalidateQueries({ queryKey: qk.stories(project.id) });
      }
    },
  });

  const isBusy =
    assignUserMutation.isPending ||
    startTaskMutation.isPending ||
    markDoneMutation.isPending;
  const selectedAssigneeId =
    assigneeOverrideId ?? task?.assigneeId ?? assignableUsers[0]?.id ?? "";
  const realizedHours =
    task?.startedAt && task.completedAt
      ? Math.max(task.completedAt - task.startedAt, 0) / 3_600_000
      : 0;
  const assignee = task?.assigneeId ? usersById.get(task.assigneeId) : null;
  const creator = task?.createdById ? usersById.get(task.createdById) : null;
  const canAssign =
    Boolean(selectedAssigneeId) &&
    task?.status !== "done" &&
    task?.assigneeId !== selectedAssigneeId;
  const canStartTask = Boolean(selectedAssigneeId) && task?.status === "todo";
  const canMarkDone = Boolean(task?.assigneeId) && task?.status === "doing";

  if (projectsQuery.isLoading || taskQuery.isLoading || (project && storiesQuery.isLoading)) {
    return <LoadingCard text="Loading task details..." />;
  }

  if (!project || !task || !story) {
    return (
      <div className="stack gap-[18px]">
        <div>
          <Button
            type="button"
            onClick={() =>
              navigate(project ? `/projects/${project.id}` : "/projects")
            }
          >
            Back
          </Button>
        </div>

        <EmptyState
          title="Task not found"
          description="The task may have been deleted or the link no longer matches this project."
        />
      </div>
    );
  }

  return (
    <div className="stack gap-[18px]">
      <section className="profile-top-grid">
        <header className="card stack project-profile-card gap-[18px]">
          <div className="row page-header-row">
            <Button
              type="button"
              onClick={() => navigate(`/projects/${project.id}/stories/${story.id}`)}
            >
              Back to story
            </Button>

            <div className="page-actions">
              <Button
                type="button"
                onClick={() => navigate(`/projects/${project.id}/stories/${story.id}`)}
              >
                Open story
              </Button>
            </div>
          </div>

          <div className="stack gap-2">
            <span className="eyebrow">Task details</span>
            <h1 className="m-0">{task.name}</h1>
            <div className="badge-row">
              <PriorityBadge value={task.priority} />
              <StatusBadge value={task.status} />
            </div>
            <p className="muted page-lead project-summary-copy">
              {task.description || "No task description yet."}
            </p>
          </div>

          <div className="stats-grid stats-grid-wide">
            <div className="stat-card">
              <div className="stat-label">Story</div>
              <div className="stat-value stat-value-sm">{story.name}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Created by</div>
              <div className="stat-value stat-value-sm">
                {creator ? formatUserName(creator.firstName, creator.lastName) : "Unknown user"}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Estimated time</div>
              <div className="stat-value stat-value-sm">{formatHours(task.estimatedHours)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Realized hours</div>
              <div className="stat-value stat-value-sm">{formatHours(realizedHours)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Responsible person</div>
              <div className="stat-value stat-value-sm">
                {assignee ? formatUserName(assignee.firstName, assignee.lastName) : "Unassigned"}
              </div>
            </div>
          </div>
        </header>

        <section className="card stack project-history-card gap-4">
          <div className="stack gap-1.5">
            <span className="eyebrow">Story</span>
            <h2 className="m-0">{story.name}</h2>
            <p className="muted page-lead">
              {story.description || "No story description yet."}
            </p>
          </div>

          <div className="badge-row">
            <PriorityBadge value={story.priority} />
            <StatusBadge value={story.status} />
          </div>

          <div className="story-footer">
            <div className="muted">Project: {project.name}</div>
            <div className="muted">Created {dateFormatter.format(story.createdAt)}</div>
          </div>
        </section>
      </section>

      <section className="profile-top-grid">
        <section className="card stack project-profile-card gap-4">
          <div className="stack gap-1.5">
            <span className="eyebrow">Timeline</span>
            <h2 className="m-0">Task timeline</h2>
          </div>

          <div className="stats-grid stats-grid-wide">
            <div className="stat-card">
              <div className="stat-label">Created</div>
              <div className="stat-value stat-value-sm">
                {dateFormatter.format(task.createdAt)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Start date</div>
              <div className="stat-value stat-value-sm">
                {task.startedAt ? dateFormatter.format(task.startedAt) : "Not started"}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Completion date</div>
              <div className="stat-value stat-value-sm">
                {task.completedAt ? dateFormatter.format(task.completedAt) : "Open"}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Status</div>
              <div className="stat-value stat-value-sm">{workItemStatusLabel[task.status]}</div>
            </div>
          </div>
        </section>

        <section className="card stack project-history-card gap-4">
          <div className="stack gap-1.5">
            <span className="eyebrow">Actions</span>
            <h2 className="m-0">Manage task</h2>
            <p className="muted page-lead">
              Assign a developer or devops person to the task, start it when work begins,
              and close it when the work is finished.
            </p>
          </div>

          <label className="grid gap-1.5">
            <div className="font-bold">Responsible person</div>
            <Select
              value={selectedAssigneeId}
              onChange={event => setAssigneeOverrideId(event.target.value)}
              disabled={assignableUsers.length === 0 || isBusy}
            >
              {assignableUsers.length === 0 && <option value="">No assignable users</option>}
              {assignableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.role})
                </option>
              ))}
            </Select>
          </label>

          <div className="form-actions">
            <Button
              type="button"
              disabled={!canAssign || isBusy}
              onClick={() => {
                if (!selectedAssigneeId) {
                  return;
                }

                void assignUserMutation.mutateAsync(selectedAssigneeId);
              }}
            >
              {assignUserMutation.isPending ? "Assigning..." : "Assign person"}
            </Button>
            {task.status === "todo" && (
              <Button
                type="button"
                disabled={!canStartTask || isBusy}
                onClick={() => {
                  if (!selectedAssigneeId) {
                    return;
                  }

                  void startTaskMutation.mutateAsync(selectedAssigneeId);
                }}
              >
                {startTaskMutation.isPending ? "Starting..." : "Start task"}
              </Button>
            )}
            {task.status === "doing" && (
              <Button
                type="button"
                disabled={!canMarkDone || isBusy}
                onClick={() => {
                  void markDoneMutation.mutateAsync();
                }}
              >
                {markDoneMutation.isPending ? "Closing..." : "Mark as done"}
              </Button>
            )}
          </div>

          <div className="empty-state empty-state-compact">
            New tasks start as `todo`. Starting a task moves it to `doing` and sets the
            start date automatically. Closing the task sets the completion date and can
            also close the story when all its tasks are done.
          </div>
        </section>
      </section>
    </div>
  );
}
