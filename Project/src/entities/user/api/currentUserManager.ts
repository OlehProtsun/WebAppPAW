import { LocalStorageClient } from "@shared/api/localStorageClient";
import type { StorageClient } from "@shared/api/storageClient";
import { MOCK_CURRENT_USER_ID, MOCK_USERS } from "../model/mockUsers";
import type { User } from "../model/types";

const STORAGE_KEY = "Project.currentUser.v1";

export class CurrentUserManager {
  constructor(private storage: StorageClient = new LocalStorageClient()) {}

  private findUserById(id: string | null) {
    return MOCK_USERS.find(user => user.id === id) ?? null;
  }

  async getCurrentUser(): Promise<User> {
    const storedUserId = await this.storage.getItem(STORAGE_KEY);
    const currentUser =
      this.findUserById(storedUserId) ?? this.findUserById(MOCK_CURRENT_USER_ID);

    if (!currentUser) {
      throw new Error("Current user not found");
    }

    return { ...currentUser };
  }

  async setCurrentUser(userId: string): Promise<User> {
    const user = this.findUserById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    await this.storage.setItem(STORAGE_KEY, user.id);

    return { ...user };
  }
}
