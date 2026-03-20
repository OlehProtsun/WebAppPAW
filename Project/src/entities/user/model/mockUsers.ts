import type { User } from "./types";

export const MOCK_CURRENT_USER_ID = "user_1";

export const MOCK_USERS: User[] = [
  {
    id: "user_1",
    firstName: "Alex",
    lastName: "Morgan",
    role: "admin",
  },
  {
    id: "user_2",
    firstName: "Riley",
    lastName: "Chen",
    role: "developer",
  },
  {
    id: "user_3",
    firstName: "Jordan",
    lastName: "Patel",
    role: "devops",
  },
];
