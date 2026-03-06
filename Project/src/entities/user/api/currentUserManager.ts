import type { User } from "../model/types";

const MOCK_CURRENT_USER: User = {
  id: "user_1",
  firstName: "Alex",
  lastName: "Morgan",
};

export class CurrentUserManager {
  async getCurrentUser(): Promise<User> {
    return MOCK_CURRENT_USER;
  }
}
