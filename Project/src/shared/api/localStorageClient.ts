// Імпортуємо тип StorageClient — контракт (інтерфейс/тип),
// який описує методи роботи зі сховищем (getItem/setItem/removeItem).
// Це type-only імпорт: потрібен лише для TypeScript типізації.
import type { StorageClient } from "./storageClient";

// LocalStorageClient — реалізація StorageClient поверх браузерного localStorage.
//
// Навіщо робити окремий клас-адаптер, а не викликати localStorage напряму:
// - інкапсуляція: логіка роботи зі storage в одному місці
// - підміна реалізації: легко замінити на sessionStorage, IndexedDB, memory storage, тощо
// - тестованість: можна підставити мок StorageClient у юніт-тестах
// - уніфікація: код, який використовує StorageClient, не залежить від конкретного API браузера
export class LocalStorageClient implements StorageClient {
  // Отримуємо значення за ключем.
  // localStorage.getItem повертає string | null:
  // - string, якщо ключ існує
  // - null, якщо ключ відсутній
  //
  // Метод оголошений async, щоб відповідати інтерфейсу StorageClient і
  // дозволити в майбутньому легко перейти на асинхронні сховища (IndexedDB, серверні API, тощо)
  // без змін у коді, який викликає storage.
  async getItem(key: string) {
    return localStorage.getItem(key);
  }

  // Записуємо значення за ключем.
  // localStorage зберігає тільки рядки, тому value тут string.
  async setItem(key: string, value: string) {
    localStorage.setItem(key, value);
  }

  // Видаляємо значення за ключем.
  async removeItem(key: string) {
    localStorage.removeItem(key);
  }
}