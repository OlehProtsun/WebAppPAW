// Імпортуємо React-хуки:
// - useState: локальний стан полів форми (name/description/error)
// - useEffect: синхронізація стану форми, коли змінюється проєкт для редагування
// - useMemo: мемоізація похідного значення (title), щоб не перераховувати без потреби
import { useEffect, useMemo, useState } from "react";

// Імпортуємо типи з сутності project:
// - Project: повна модель проєкту (використовується як initial для редагування)
// - ProjectCreateInput: дані, які очікуємо на submit (name + description)
import type { Project, ProjectCreateInput } from "@entities/project";

// Імпортуємо валідатор, який перевіряє і нормалізує input (trim, ліміти довжин тощо).
import { validateProjectInput } from "@entities/project";

// UI-компоненти (ймовірно власні обгортки над <button>, <input>, <textarea> з єдиними стилями).
import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";
import { Textarea } from "@shared/ui/Textarea";

// Тип пропсів форми.
// - initial?: якщо передали проєкт — форма працює в режимі редагування; якщо null/undefined — у режимі створення
// - onSubmit: колбек, який отримає дані форми (ProjectCreateInput). Може бути async або sync.
// - onCancel?: опційний колбек для кнопки Cancel (показується лише в режимі редагування)
// - submitText?: опційний текст кнопки submit (якщо не передано — підставиться дефолтний)
type Props = {
  initial?: Project | null;
  onSubmit: (data: ProjectCreateInput) => Promise<void> | void;
  onCancel?: () => void;
  submitText?: string;
};

// Компонент форми створення/редагування проєкту.
// Одна форма використовується для двох режимів:
// - Create: initial = null
// - Edit:   initial = Project
export function ProjectForm({ initial = null, onSubmit, onCancel, submitText }: Props) {
  // Локальний стан для поля "Name".
  // Початкове значення:
  // - якщо initial є — беремо initial.name (режим редагування),
  // - інакше — порожній рядок (режим створення).
  const [name, setName] = useState(initial?.name ?? "");

  // Локальний стан для поля "Description" з аналогічною логікою ініціалізації.
  const [description, setDescription] = useState(initial?.description ?? "");

  // Стан для повідомлення про помилку валідації.
  // null означає "помилок немає".
  const [error, setError] = useState<string | null>(null);

  // Синхронізація стану форми при зміні проєкту, який редагується.
  //
  // ✅ Важливо:
  // Якщо користувач відкрив форму для Project A, а потім переключився на Project B,
  // нам треба підставити нові значення у поля.
  //
  // Залежність [initial?.id] означає:
  // ефект спрацює, коли зміниться id проєкту (або стане undefined/null).
  // Це зручно, бо:
  // - при зміні саме проєкту (інший id) — точно треба оновити поля,
  // - при зміні інших властивостей initial без зміни id — ефект не обов’язково має бігти (за задумом автора).
  useEffect(() => {
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setError(null); // при переключенні проєкту скидаємо помилки, щоб не переносити їх між режимами
  }, [initial?.id]);

  // Заголовок форми залежить від режиму.
  // useMemo тут використаний для уникнення зайвих перерахунків,
  // хоча обчислення просте — це радше "акуратність" і стабільність значення.
  const title = useMemo(() => (initial ? "Edit project" : "Create project"), [initial]);

  // Обробник submit форми.
  // Робимо async, бо onSubmit може повертати Promise.
  async function handleSubmit(e: React.FormEvent) {
    // Скасовуємо стандартну поведінку HTML-форми (перезавантаження сторінки).
    e.preventDefault();

    // Перед новою валідацією — скидаємо попередню помилку.
    setError(null);

    // Валідатор:
    // - обрізає пробіли (trim),
    // - перевіряє обов'язковість name та ліміти довжин,
    // - повертає або { ok: false, error }, або { ok: true, value }.
    const res = validateProjectInput({ name, description });

    // Якщо валідація не пройшла — показуємо помилку і виходимо.
    if (!res.ok) {
      setError(res.error);
      return;
    }

    // Якщо все ок — викликаємо onSubmit з нормалізованими даними (res.value).
    // await коректно працює і для sync-функції (просто обгорне значення).
    await onSubmit(res.value);

    // Очищаємо поля лише у режимі створення.
    // Логіка: після створення зручно мати "чисту" форму для нового проєкту,
    // а при редагуванні — залишаємо введені/збережені значення.
    if (!initial) {
      setName("");
      setDescription("");
    }
  }

  return (
    // <form> обробляє submit по Enter і по кнопці type="submit".
    // className="card stack" — стилі: картка + вертикальний стек елементів.
    // style={{ gap: 12 }} — відстань між елементами форми.
    <form onSubmit={handleSubmit} className="card stack" style={{ gap: 12 }}>
      {/* Верхній ряд: заголовок + (в режимі редагування) кнопка Cancel */}
      <div className="row">
        <div>
          {/* Заголовок залежно від режиму */}
          <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>

          {/* Підзаголовок/пояснення залежно від режиму */}
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {initial
              ? "Update name and description and save changes."
              : "Fill in the fields and create a new project."}
          </div>
        </div>

        {/* Кнопка Cancel показується лише:
            - якщо ми в режимі редагування (initial існує)
            - і якщо передали onCancel
            Це захищає від рендеру кнопки без обробника. */}
        {initial && onCancel && (
          <Button type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      {/* Поле Name */}
      <label className="stack" style={{ gap: 6 }}>
        <div style={{ fontWeight: 700 }}>Name</div>

        {/* Контрольований інпут:
            - value береться зі state
            - onChange оновлює state
            placeholder — приклад для користувача */}
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="E.g. Website redesign"
        />
      </label>

      {/* Поле Description */}
      <label className="stack" style={{ gap: 6 }}>
        <div style={{ fontWeight: 700 }}>Description</div>

        {/* Контрольована textarea:
            - value зі state
            - onChange оновлює state
            - rows=4 задає висоту в рядках
            - placeholder — підказка */}
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          placeholder="Short description..."
        />
      </label>

      {/* Блок помилки: рендеримо лише якщо error не null */}
      {error && (
        <div
          className="card card-sm"
          // Інлайн-стиль під "alert/error" вигляд:
          // - borderColor і background з червоним відтінком для візуального сигналу
          style={{
            borderColor: "rgba(255,59,48,0.35)",
            background: "rgba(255,59,48,0.06)",
          }}
        >
          <div style={{ fontWeight: 800 }}>Error</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {error}
          </div>
        </div>
      )}

      {/* Нижній ряд з кнопками */}
      <div style={{ display: "flex", gap: 10 }}>
        {/* Основна submit-кнопка:
            - якщо submitText передали — використовуємо його
            - інакше: "Save" для edit, "Create" для create */}
        <Button type="submit">{submitText ?? (initial ? "Save" : "Create")}</Button>

        {/* Кнопка Clear показується лише у режимі створення.
            Вона скидає поля і помилку. */}
        {!initial && (
          <Button
            type="button" // важливо: щоб не тригерити submit форми
            onClick={() => {
              setName("");
              setDescription("");
              setError(null);
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </form>
  );
}