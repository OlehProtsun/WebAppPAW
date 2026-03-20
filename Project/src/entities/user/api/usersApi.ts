import { MOCK_USERS } from "../model/mockUsers";
import { type User, type UserId } from "../model/types";

export class UsersApi {
  async list(): Promise<User[]> {
    return MOCK_USERS.map(user => ({ ...user }));
  }

  async getById(id: UserId): Promise<User | null> {
    const user = MOCK_USERS.find(item => item.id === id);
    return user ? { ...user } : null;
  }

  async listAssignable(): Promise<User[]> {
    const users = await this.list();
    return users.filter(user => user.role !== "admin");
  }
}
