import type { StorageClient } from "./storageClient";

export class LocalStorageClient implements StorageClient {
  async getItem(key: string) {
    return localStorage.getItem(key);
  }
  async setItem(key: string, value: string) {
    localStorage.setItem(key, value);
  }
  async removeItem(key: string) {
    localStorage.removeItem(key);
  }
}