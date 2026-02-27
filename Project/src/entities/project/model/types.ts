// Тип-аліас для ідентифікатора проєкту.
// Зараз це просто string, але винесення в окремий тип дає переваги:
// - краща читабельність (видно, що це саме ProjectId, а не будь-який рядок),
// - легше змінити тип у майбутньому (наприклад, на брендований тип або іншу структуру),
// - менше плутанини між різними id в домені.
export type ProjectId = string;

// Основний доменний інтерфейс "Project" — повна структура проєкту, яка зберігається та повертається API.
//
// Включає:
// - бізнес-поля (name, description),
// - системні поля (id, createdAt, updatedAt).
export interface Project {
  // Унікальний ідентифікатор проєкту.
  id: ProjectId;

  // Назва проєкту (людський заголовок).
  name: string;

  // Опис проєкту (довільний текст).
  description: string;

  // Час створення проєкту у форматі Unix timestamp в мілісекундах.
  // Тобто значення на кшталт Date.now().
  createdAt: number; // unix ms timestamp

  // Час останнього оновлення проєкту у форматі Unix timestamp в мілісекундах.
  // Оновлюється при зміні даних проєкту.
  updatedAt: number; // unix ms timestamp
}

// Тип для створення проєкту (input при create).
// Використовуємо Omit, щоб прибрати поля, які користувач/клієнт НЕ повинен задавати сам:
// - id генерується системою,
// - createdAt/updatedAt виставляються системою.
//
// Таким чином, для створення потрібні лише "бізнес-поля": name та description.
export type ProjectCreateInput = Omit<Project, "id" | "createdAt" | "updatedAt">;

// Тип для оновлення проєкту (input при update).
// Partial робить всі поля опційними, тобто можна передати лише ті, які треба змінити.
// Оскільки базою є ProjectCreateInput, тут дозволено оновлювати лише name/description,
// а не системні поля (id/createdAt/updatedAt).
export type ProjectUpdateInput = Partial<ProjectCreateInput>;