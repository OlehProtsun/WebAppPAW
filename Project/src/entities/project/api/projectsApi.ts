// Імпортуємо nanoid — генератор унікальних коротких ID.
// Використовується для створення id нового проєкту, щоб він гарантовано відрізнявся від інших.
import { nanoid } from "nanoid";

// Імпортуємо тип StorageClient — абстракція над сховищем (наприклад localStorage/IndexedDB/будь-що).
// Важливо: це type-only імпорт (не потрапляє в runtime), потрібен лише для типізації.
import type { StorageClient } from "@shared/api/storageClient";

// safeJsonParse — безпечний парсер JSON:
// - якщо рядок null/undefined/порожній/невалідний JSON — поверне дефолтне значення (тут []).
// Це захищає від падінь при читанні з storage.
import { safeJsonParse } from "@shared/lib/safeJson";

// Імпортуємо типи доменної моделі "Project" та DTO для створення/оновлення.
// - Project: повна структура проєкту
// - ProjectCreateInput: поля, які дозволено передати при створенні
// - ProjectUpdateInput: поля, які дозволено "патчити" при оновленні
// - ProjectId: тип ідентифікатора (наприклад string)
import type {
  Project,
  ProjectCreateInput,
  ProjectId,
  ProjectUpdateInput,
} from "../model/types";

// Ключ, під яким список проєктів зберігається у storage.
// Версія "v1" у ключі — типова практика для майбутніх міграцій структури даних:
// якщо формат зміниться, можна перейти на інший ключ, не ламаючи старі дані.
const STORAGE_KEY = "Project.projects.v1";

// Клас ProjectsApi інкапсулює CRUD-операції над проєктами,
// використовуючи переданий StorageClient як транспорт збереження.
export class ProjectsApi {
  // Через constructor dependency injection передаємо реалізацію storage.
  // "private storage" одразу створює приватне поле класу.
  constructor(private storage: StorageClient) {}

  // Приватний метод: читає всі проєкти зі сховища.
  // Повертає масив Project (або порожній, якщо даних немає/JSON зламаний).
  private async readAll(): Promise<Project[]> {
    // Отримуємо "сире" значення з storage (зазвичай це рядок або null).
    const raw = await this.storage.getItem(STORAGE_KEY);

    // Парсимо JSON безпечно: якщо raw невалідний — повернеться [].
    return safeJsonParse<Project[]>(raw, []);
  }

  // Приватний метод: записує весь масив проєктів назад у storage.
  // Важливо: це "повний перезапис" списку (не інкрементальний апдейт).
  private async writeAll(projects: Project[]): Promise<void> {
    // Серіалізуємо масив у JSON-рядок і зберігаємо.
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  // Публічний метод: повертає список проєктів, відсортований за датою останнього оновлення.
  // updatedAt більший => проєкт "свіжіший" => йде вище.
  async list(): Promise<Project[]> {
    const projects = await this.readAll();

    // Створюємо копію масиву перед sort, щоб не мутувати оригінал (good practice).
    // sort: спаданням (b - a) за updatedAt.
    return [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // Публічний метод: знайти проєкт за id.
  // Якщо не знайдено — повертаємо null (замість кидання помилки).
  async getById(id: ProjectId): Promise<Project | null> {
    const projects = await this.readAll();

    // find повертає Project | undefined, тому додаємо ?? null для явного null.
    return projects.find(p => p.id === id) ?? null;
  }

  // Публічний метод: створення нового проєкту.
  // На вході — лише поля, дозволені для створення (ProjectCreateInput).
  // На виході — повноцінний Project з id та timestamps.
  async create(input: ProjectCreateInput): Promise<Project> {
    // Читаємо поточний список з storage.
    const projects = await this.readAll();

    // Фіксуємо час створення/оновлення.
    // Date.now() повертає timestamp у мілісекундах.
    const now = Date.now();

    // Формуємо новий об’єкт Project.
    // id генеруємо через nanoid().
    const project: Project = {
      id: nanoid(),
      name: input.name,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    };

    // Записуємо назад: старі + новий.
    await this.writeAll([...projects, project]);

    // Повертаємо створений проєкт (зручний для UI/подальшої логіки).
    return project;
  }

  // Публічний метод: оновлення існуючого проєкту.
  // - id: який проєкт оновлюємо
  // - patch: часткові зміни (ProjectUpdateInput), які "накладаються" на існуючий проєкт
  async update(id: ProjectId, patch: ProjectUpdateInput): Promise<Project> {
    // Читаємо всі проєкти.
    const projects = await this.readAll();

    // Шукаємо індекс проєкту, щоб замінити його в масиві.
    const idx = projects.findIndex(p => p.id === id);

    // Якщо не знайдено — кидаємо помилку.
    // Це сигнал для викликача, що оновити неможливо.
    if (idx === -1) throw new Error("Project not found");

    // Створюємо "оновлену" версію:
    // - беремо поточний проєкт,
    // - накладаємо patch (може містити name/description тощо),
    // - примусово оновлюємо updatedAt на поточний час.
    //
    // Порядок важливий:
    // - ...projects[idx] задає базу,
    // - ...patch перезаписує дозволені поля,
    // - updatedAt в кінці гарантує, що timestamp завжди актуальний (і не буде підмінений patch'ем).
    const updated: Project = {
      ...projects[idx],
      ...patch,
      updatedAt: Date.now(),
    };

    // Створюємо копію масиву, щоб не мутувати оригінал напряму.
    const next = [...projects];

    // Замінюємо елемент за індексом на updated.
    next[idx] = updated;

    // Записуємо оновлений список у storage.
    await this.writeAll(next);

    // Повертаємо оновлений проєкт.
    return updated;
  }

  // Публічний метод: видалення проєкту за id.
  // Повертає Promise<void> — тобто нічого не повертає, лише гарантує завершення операції.
  async remove(id: ProjectId): Promise<void> {
    const projects = await this.readAll();

    // Фільтруємо список, прибираючи проєкт з потрібним id, і записуємо назад.
    await this.writeAll(projects.filter(p => p.id !== id));
  }
}