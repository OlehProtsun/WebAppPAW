import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LocalStorageClient } from "@shared/api/localStorageClient";
import { Button } from "@shared/ui/Button";
import { ProjectsApi, type Project, type ProjectCreateInput } from "@entities/project";
import { ProjectForm } from "@features/project-form";

const qk = {
  projects: ["projects"] as const
};

export function ProjectsPage() {
  const queryClient = useQueryClient();

  // інстанс API (пізніше заміниш LocalStorageClient на CloudClient)
  const api = useMemo(() => new ProjectsApi(new LocalStorageClient()), []);

  const [editing, setEditing] = useState<Project | null>(null);

  const projectsQuery = useQuery({
    queryKey: qk.projects,
    queryFn: () => api.list()
  });

  const createMutation = useMutation({
    mutationFn: (data: ProjectCreateInput) => api.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.projects });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProjectCreateInput }) => api.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.projects });
      setEditing(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.projects });
    }
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>ManageMe — Projects</h1>

      {!editing ? (
        <ProjectForm
          onSubmit={async data => {
            await createMutation.mutateAsync(data);
          }}
        />
      ) : (
        <ProjectForm
          initial={editing}
          submitText="Оновити"
          onCancel={() => setEditing(null)}
          onSubmit={async data => {
            await updateMutation.mutateAsync({ id: editing.id, data });
          }}
        />
      )}

      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Project List</h2>

        {projectsQuery.isLoading && <div>Loading...</div>}
        {projectsQuery.isError && <div style={{ color: "crimson" }}>Error loading projects</div>}

        {projectsQuery.data?.length === 0 && <div>No projects yet.</div>}

        <div style={{ display: "grid", gap: 10 }}>
          {projectsQuery.data?.map(p => (
            <div
              key={p.id}
              style={{
                border: "1px solid #333",
                borderRadius: 12,
                padding: 12,
                display: "grid",
                gap: 8
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button type="button" onClick={() => setEditing(p)}>
                    Редагувати
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      const ok = confirm(`Delete "${p.name}"?`);
                      if (ok) deleteMutation.mutate(p.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {p.description && <div style={{ whiteSpace: "pre-wrap" }}>{p.description}</div>}
              <div style={{ fontSize: 12, opacity: 0.7 }}>id: {p.id}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}