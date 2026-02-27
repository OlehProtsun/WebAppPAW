// Імпортуємо React-хуки:
// - useState: локальний стан для "який проєкт редагуємо" та "який проєкт хочемо видалити"
// - useMemo: мемоізуємо API-клієнт, щоб не створювати його на кожен ререндер
import { useMemo, useState } from "react";

// Імпортуємо хуки з @tanstack/react-query:
// - useQuery: для завантаження списку проєктів (кеш, стани loading/error, тощо)
// - useMutation: для create/update/delete операцій
// - useQueryClient: доступ до queryClient для інвалідації кешу після мутацій
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// LocalStorageClient — реалізація StorageClient, яка працює з localStorage.
// Використовується як "тимчасовий бекенд" (псевдо API) для CRUD.
import { LocalStorageClient } from "@shared/api/localStorageClient";

// UI-компонент кнопки.
import { Button } from "@shared/ui/Button";

// Імпортуємо API та типи з сутності project:
// - ProjectsApi: клас з методами list/create/update/remove
// - Project: повна модель
// - ProjectCreateInput: дані, які передаємо при create/update (name, description)
import { ProjectsApi, type Project, type ProjectCreateInput } from "@entities/project";

// ProjectForm — форма створення/редагування проєкту.
import { ProjectForm } from "@features/project-form";

// ConfirmDialog — діалог підтвердження (тут використовується для видалення).
import { ConfirmDialog } from "@shared/ui/ConfirmDialog";

// qk (query keys) — централізовано описуємо ключі запитів react-query.
// Це важливо, щоб:
// - уникнути "магічних" рядків по коду,
// - гарантовано інвалідовувати саме ті запити, які треба.
const qk = {
  projects: ["projects"] as const, // as const робить ключ літеральним та стабільно типізованим
};

// Сторінка керування проєктами: CRUD через localStorage, але з react-query як "state manager" для запитів.
export function ProjectsPage() {
  // Отримуємо queryClient для роботи з кешем (invalidateQueries після мутацій).
  const queryClient = useQueryClient();

  // Створюємо екземпляр API один раз.
  // useMemo з [] означає, що ProjectsApi буде створений при першому рендері і далі не зміниться.
  //
  // Навіщо це важливо:
  // - щоб queryFn/mutationFn посилались на стабільний api,
  // - щоб уникнути створення нового LocalStorageClient/ProjectsApi при кожному ререндері.
  const api = useMemo(() => new ProjectsApi(new LocalStorageClient()), []);

  // editing — поточний проєкт, який редагуємо.
  // null означає режим створення (Create).
  const [editing, setEditing] = useState<Project | null>(null);

  // projectToDelete — проєкт, який користувач обрав для видалення (відкриває ConfirmDialog).
  // null означає, що діалог не відкритий / немає кандидата на видалення.
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Запит на отримання списку проєктів.
  // react-query:
  // - кешує результат по queryKey
  // - виставляє isLoading/isError/data
  const projectsQuery = useQuery({
    queryKey: qk.projects,
    queryFn: () => api.list(), // фактичне джерело даних — localStorage через ProjectsApi
  });

  // Мутація створення проєкту.
  const createMutation = useMutation({
    // mutationFn отримує дані форми і викликає api.create.
    mutationFn: (data: ProjectCreateInput) => api.create(data),

    // onSuccess: після успішного створення інвалідовуємо список проєктів,
    // щоб він перезавантажився і показав новий елемент.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.projects });
    },
  });

  // Мутація оновлення проєкту.
  const updateMutation = useMutation({
    // Тут payload містить і id, і data (name/description).
    // Типізуємо параметр прямо в сигнатурі.
    mutationFn: ({ id, data }: { id: string; data: ProjectCreateInput }) => api.update(id, data),

    // Після успішного оновлення:
    // - інвалідовуємо список, щоб отримати актуальні дані
    // - виходимо з режиму редагування (setEditing(null))
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.projects });
      setEditing(null);
    },
  });

  // Мутація видалення проєкту.
  const deleteMutation = useMutation({
    // Видаляємо за id.
    mutationFn: (id: string) => api.remove(id),

    // onSuccess може отримати:
    // - перший аргумент: результат мутації (тут void, тому _)
    // - другий аргумент: змінні (variables), тобто id, який передавали в mutate/mutateAsync
    onSuccess: async (_, id) => {
      // Оновлюємо список проєктів після видалення.
      await queryClient.invalidateQueries({ queryKey: qk.projects });

      // Якщо зараз редагували саме той проєкт, який видалили — скидаємо editing.
      // Інакше залишаємо як було.
      setEditing(prev => (prev?.id === id ? null : prev));

      // Закриваємо діалог підтвердження.
      setProjectToDelete(null);
    },
  });

  // Загальний прапорець "зайнятості" — якщо хоч одна мутація зараз виконується,
  // то блокуємо деякі дії (наприклад, кнопки Edit/Delete), щоб уникнути гонок станів.
  const isBusy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="stack">
      {/* Заголовок сторінки */}
      <header className="stack" style={{ gap: 6 }}>
        <h1 style={{ margin: 0 }}>ManageMe</h1>
        <div className="muted">Projects CRUD (localStorage as temporary API)</div>
      </header>

      {/* Двоколонковий лейаут:
          - зліва форма (create/edit)
          - справа список проєктів */}
      <div className="two-col">
        {/* LEFT: форма (sticky — ймовірно прилипає при скролі) */}
        <div className="stack sticky">
          {/* Якщо editing = null => Create-режим, показуємо форму без initial */}
          {!editing ? (
            <ProjectForm
              // onSubmit: при submit викликаємо createMutation
              onSubmit={async data => {
                await createMutation.mutateAsync(data);
              }}
              // Текст на кнопці може показувати стан виконання
              submitText={createMutation.isPending ? "Creating..." : "Create"}
            />
          ) : (
            // Якщо editing не null => Edit-режим, передаємо initial та інші пропси
            <ProjectForm
              initial={editing}
              submitText={updateMutation.isPending ? "Saving..." : "Update"}
              // Кнопка Cancel у формі скидає режим редагування
              onCancel={() => setEditing(null)}
              // onSubmit: викликаємо updateMutation з id + data
              onSubmit={async data => {
                await updateMutation.mutateAsync({ id: editing.id, data });
              }}
            />
          )}
        </div>

        {/* RIGHT: список */}
        <section className="stack" style={{ gap: 12 }}>
          {/* Заголовок секції списку + лічильник */}
          <div className="row">
            <h2 style={{ margin: 0 }}>Project List</h2>

            {/* Лічильник показуємо лише якщо data вже є (щоб не показувати "undefined items") */}
            <div className="muted" style={{ fontSize: 13 }}>
              {projectsQuery.data ? `${projectsQuery.data.length} items` : ""}
            </div>
          </div>

          {/* Стан завантаження */}
          {projectsQuery.isLoading && <div className="card">Loading...</div>}

          {/* Стан помилки */}
          {projectsQuery.isError && (
            <div className="card" style={{ borderColor: "rgba(255,59,48,0.35)" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Error loading projects</div>
              <div className="muted">Open console for details.</div>
            </div>
          )}

          {/* Стан "порожньо" — коли data є, але масив пустий */}
          {projectsQuery.data?.length === 0 && <div className="card">No projects yet.</div>}

          {/* Рендер списку проєктів */}
          <div className="stack" style={{ gap: 12 }}>
            {projectsQuery.data?.map(p => (
              // article — семантично: окремий елемент списку/контенту
              <article key={p.id} className="card card-sm stack" style={{ gap: 10 }}>
                <div className="row">
                  {/* Назва проєкту */}
                  <div style={{ fontWeight: 800 }}>{p.name}</div>

                  {/* Кнопки дій */}
                  <div style={{ display: "flex", gap: 8 }}>
                    {/* Edit:
                        - ставимо editing в поточний проєкт
                        - disabled при isBusy, щоб не накладати операції */}
                    <Button type="button" onClick={() => setEditing(p)} disabled={isBusy}>
                      Edit
                    </Button>

                    {/* Delete:
                        - відкриваємо ConfirmDialog, встановлюючи projectToDelete
                        - disabled при isBusy */}
                    <Button
                      type="button"
                      variant="danger"
                      disabled={isBusy}
                      onClick={() => setProjectToDelete(p)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Опис: якщо є текст — показуємо його з pre-wrap (зберігаємо переноси рядків),
                    якщо порожній — показуємо "No description" */}
                {p.description ? (
                  <div style={{ whiteSpace: "pre-wrap" }}>{p.description}</div>
                ) : (
                  <div className="muted">No description</div>
                )}

                {/* Технічна інформація: id проєкту (може бути корисно для дебагу) */}
                <div className="muted" style={{ fontSize: 12 }}>
                  id: {p.id}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* Діалог підтвердження видалення */}
      <ConfirmDialog
        // open: true, якщо projectToDelete не null
        open={Boolean(projectToDelete)}
        // Заголовок: якщо є обраний проєкт — підставляємо його назву в текст
        title={projectToDelete ? `Delete "${projectToDelete.name}"?` : "Delete project?"}
        // Опис дії (попередження про незворотність)
        description="This action cannot be undone."
        // Тексти кнопок
        confirmText="Delete"
        cancelText="Cancel"
        // danger: вказує діалогу, що дія небезпечна (може впливати на стилі)
        danger
        // loading: під час виконання видалення показуємо стан завантаження в діалозі
        loading={deleteMutation.isPending}
        // onConfirm: викликається при підтвердженні
        onConfirm={async () => {
          // Захист: якщо чомусь projectToDelete вже null — нічого не робимо
          if (!projectToDelete) return;

          // Запускаємо мутацію видалення по id
          await deleteMutation.mutateAsync(projectToDelete.id);
        }}
        // onCancel: закриття діалогу
        onCancel={() => {
          // Якщо видалення вже триває — не даємо закривати (щоб не ламати UX/стан)
          if (deleteMutation.isPending) return;

          // Інакше — просто скидаємо projectToDelete, тим самим закриваючи діалог
          setProjectToDelete(null);
        }}
      />
    </div>
  );
}