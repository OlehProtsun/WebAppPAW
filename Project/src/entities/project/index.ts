// Цей файл зазвичай виконує роль "публічного входу" (barrel file) для модуля projects.
// Тобто він реекспортує (перепубліковує) потрібні типи та функції/класи,
// щоб інші частини проєкту могли імпортувати все з одного місця,
// не знаючи внутрішню структуру папок модуля.

// Реекспортуємо типи з ./model/types.
//
// `export type { ... }` означає, що експортуються лише типи TypeScript,
// і вони НЕ потрапляють у збірку (runtime).
// Це зменшує "шум" у бандлі та чітко відділяє типи від значень.
export type { Project, ProjectCreateInput, ProjectUpdateInput, ProjectId } from "./model/types";

// Реекспортуємо функцію валідації інпуту для проєкту.
// Це runtime-експорт: інші модулі можуть викликати validateProjectInput напряму.
export { validateProjectInput } from "./model/validators";

// Реекспортуємо клас ProjectsApi — API-обгортку для CRUD операцій над проєктами.
// Це теж runtime-експорт.
export { ProjectsApi } from "./api/projectsApi";