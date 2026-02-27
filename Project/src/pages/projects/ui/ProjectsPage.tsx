import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LocalStorageClient } from "@shared/api/localStorageClient";
import { Button } from "@shared/ui/Button";
import { ProjectsApi, type Project, type ProjectCreateInput } from "@entities/project";
import { ProjectForm } from "@features/project-form";

const qk = {
  projects: ["projects"] as const,
};

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const api = useMemo(() => new ProjectsApi(new LocalStorageClient()), []);

  const [editing, setEditing] = useState<Project | null>(null);

  const projectsQuery = useQuery({
    queryKey: qk.projects,
    queryFn: () => api.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: ProjectCreateInput) => api.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.projects });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProjectCreateInput }) => api.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.projects });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.projects });
      // якщо видалив те, що редагував — закриємо режим редагування
      setEditing(prev => (prev?.id === id ? null : prev));
    },
  });

  const isBusy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="stack">
      <header className="stack" style={{ gap: 6 }}>
        <h1 style={{ margin: 0 }}>ManageMe</h1>
        <div className="muted">Projects CRUD (localStorage as temporary API)</div>
      </header>

      {!editing ? (
        <ProjectForm
          onSubmit={async data => {
            await createMutation.mutateAsync(data);
          }}
          submitText={createMutation.isPending ? "Створення..." : "Створити"}
        />
      ) : (
        <ProjectForm
          initial={editing}
          submitText={updateMutation.isPending ? "Збереження..." : "Оновити"}
          onCancel={() => setEditing(null)}
          onSubmit={async data => {
            await updateMutation.mutateAsync({ id: editing.id, data });
          }}
        />
      )}

      <section className="stack" style={{ gap: 12 }}>
        <div className="row">
          <h2 style={{ margin: 0 }}>Project List</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            {projectsQuery.data ? `${projectsQuery.data.length} items` : ""}
          </div>
        </div>

        {projectsQuery.isLoading && <div className="card">Loading...</div>}

        {projectsQuery.isError && (
          <div className="card" style={{ borderColor: "rgba(255,59,48,0.35)" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Error loading projects</div>
            <div className="muted">Open console for details.</div>
          </div>
        )}

        {projectsQuery.data?.length === 0 && <div className="card">No projects yet.</div>}

        <div className="stack" style={{ gap: 12 }}>
          {projectsQuery.data?.map(p => (
            <article key={p.id} className="card card-sm stack" style={{ gap: 10 }}>
              <div className="row">
                <div style={{ fontWeight: 800 }}>{p.name}</div>

                <div style={{ display: "flex", gap: 8 }}>
                  <Button type="button" onClick={() => setEditing(p)} disabled={isBusy}>
                    Редагувати
                  </Button>

                  <Button
                    type="button"
                    variant="danger"
                    disabled={isBusy}
                    onClick={() => {
                      const ok = confirm(`Delete "${p.name}"?`);
                      if (ok) deleteMutation.mutate(p.id);
                    }}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>

              {p.description ? (
                <div style={{ whiteSpace: "pre-wrap" }}>{p.description}</div>
              ) : (
                <div className="muted">No description</div>
              )}

              <div className="muted" style={{ fontSize: 12 }}>
                id: {p.id}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}