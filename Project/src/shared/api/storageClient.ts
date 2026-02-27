// Інтерфейс StorageClient — контракт для будь-якого сховища даних за принципом "ключ-значення".
//
// Ідея:
// код вищого рівня (наприклад ProjectsApi) працює не з конкретним localStorage,
// а з абстракцією StorageClient. Це дає:
// - можливість легко міняти реалізацію (localStorage, sessionStorage, IndexedDB, memory storage, серверний API)
// - кращу тестованість (можна підставити мок/фейк реалізацію)
// - єдині типи та очікування по поведінці
export interface StorageClient {
  // Повертає значення за ключем.
  // Якщо ключ не існує — повертає null.
  // Promise використовується для уніфікації з асинхронними сховищами.
  getItem(key: string): Promise<string | null>;

  // Записує значення за ключем.
  // Нічого не повертає, лише сигналізує завершення операції через Promise<void>.
  setItem(key: string, value: string): Promise<void>;

  // Видаляє значення за ключем.
  // Також повертає Promise<void> як ознаку завершення.
  removeItem(key: string): Promise<void>;
}