export type UserId = string;

export const ASSIGNABLE_USER_ROLES = ["devops", "developer"] as const;

export type AssignableUserRole = (typeof ASSIGNABLE_USER_ROLES)[number];
export type UserRole = "admin" | AssignableUserRole;

export interface User {
  id: UserId;
  firstName: string;
  lastName: string;
  role: UserRole;
}
