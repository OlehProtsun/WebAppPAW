// Імпортуємо тип ProjectCreateInput — структуру даних, яку очікуємо на вході при створенні проєкту.
// Це type-only імпорт: потрібен лише для TypeScript типізації, в runtime не існує.
import type { ProjectCreateInput } from "./types";

// Функція валідації даних для створення проєкту.
//
// Приймає input (name, description) і повертає "дискримінований" результат у двох варіантах:
// 1) { ok: false, error: string } — якщо є помилка валідації
// 2) { ok: true, value: { name, description } } — якщо все добре, і повертаємо "нормалізовані" значення
//
// Нормалізація тут означає: обрізаємо пробіли з країв (trim), щоб:
// - не дозволяти ім'я з одних пробілів,
// - прибрати випадкові пробіли на початку/в кінці.
export function validateProjectInput(input: ProjectCreateInput) {
  // Беремо name і прибираємо пробіли з початку та кінця.
  // Це дозволяє вважати "   " порожнім значенням.
  const name = input.name.trim();

  // Перевірка "обов'язковості" імені:
  // якщо після trim рядок порожній — повертаємо помилку.
  //
  // Важливий нюанс: `false as const` фіксує тип поля ok як літеральний `false`,
  // а не загальний boolean. Це зручно для TypeScript, щоб потім звужувати типи по ok.
  if (!name) return { ok: false as const, error: "Name is required" };

  // Обмежуємо довжину назви.
  // Якщо довше 120 символів — повертаємо помилку.
  if (name.length > 120) return { ok: false as const, error: "Name is too long" };

  // Аналогічно нормалізуємо description (trim з країв).
  const description = input.description.trim();

  // Обмежуємо довжину опису.
  // Якщо більше 2000 символів — повертаємо помилку.
  if (description.length > 2000)
    return { ok: false as const, error: "Description is too long" };

  // Якщо всі перевірки пройдені:
  // - повертаємо ok: true
  // - у value кладемо вже "очищені" (trim) name та description.
  //
  // `true as const` фіксує ok як літеральний `true`, що дає точне звуження типу при перевірці `if (result.ok)`.
  return { ok: true as const, value: { name, description } };
}