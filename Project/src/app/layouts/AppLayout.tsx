import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, useNavigate } from "react-router";
import { useTheme } from "@app/theme/useTheme";
import { CurrentUserManager, UsersApi } from "@entities/user";
import { LocalStorageClient } from "@shared/api/localStorageClient";
import { cn } from "@shared/lib/cn";
import { qk } from "@shared/lib/queryKeys";

function formatRoleLabel(role: string) {
  if (role === "developer") {
    return "devel.";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.charAt(0) ?? ""}${lastName?.charAt(0) ?? ""}` || "--";
}

function shortenLabel(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= 3) {
    return value.slice(0, maxLength);
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

export function AppLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDark, toggleTheme } = useTheme();
  const storage = useMemo(() => new LocalStorageClient(), []);
  const currentUserManager = useMemo(() => new CurrentUserManager(storage), [storage]);
  const usersApi = useMemo(() => new UsersApi(), []);

  const currentUserQuery = useQuery({
    queryKey: qk.currentUser,
    queryFn: () => currentUserManager.getCurrentUser(),
  });

  const usersQuery = useQuery({
    queryKey: qk.users,
    queryFn: () => usersApi.list(),
  });

  const selectUserMutation = useMutation({
    mutationFn: (userId: string) => currentUserManager.setCurrentUser(userId),
    onSuccess: async user => {
      queryClient.setQueryData(qk.currentUser, user);
      await queryClient.invalidateQueries({ queryKey: qk.currentUser });
    },
  });

  const currentUserName = currentUserQuery.data
    ? `${currentUserQuery.data.firstName} ${currentUserQuery.data.lastName}`
    : "Loading...";
  const currentUserShortName = currentUserQuery.data?.firstName ?? "Loading";
  const currentUserRole = currentUserQuery.data
    ? formatRoleLabel(currentUserQuery.data.role)
    : "Loading...";
  const currentUserInitials = getInitials(
    currentUserQuery.data?.firstName,
    currentUserQuery.data?.lastName
  );
  const userOptions = usersQuery.data ?? [];
  const nextThemeLabel = isDark ? "light" : "dark";

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-inner">
          <div className="sidebar-nav">
            <div className="sidebar-nav-group">
              <span className="sidebar-plain-label">Pages</span>

              <button
                type="button"
                className="sidebar-page-tile"
                onClick={() => navigate("/projects")}
                aria-label="Open projects list"
              >
                PJ
              </button>

              <span className="sidebar-link-label">Projects</span>
            </div>

            <div className="sidebar-nav-group">
              <span className="sidebar-plain-label">Theme</span>

              <button
                type="button"
                className={cn(
                  "sidebar-page-tile theme-toggle-btn",
                  isDark && "theme-toggle-active"
                )}
                onClick={toggleTheme}
                aria-label={`Switch to ${nextThemeLabel} mode`}
                title={`Switch to ${nextThemeLabel} mode`}
              >
                <svg viewBox="0 0 24 24" className="theme-toggle-icon" aria-hidden="true">
                  {isDark ? (
                    <path
                      d="M12 4.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V5.5a.75.75 0 0 1 .75-.75Zm0 12.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V18.25a.75.75 0 0 1 .75-.75Zm7.25-5.5a.75.75 0 0 1 .75.75.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5Zm-13 0a.75.75 0 0 1 .75.75.75.75 0 0 1-.75.75H4.75a.75.75 0 0 1 0-1.5h1.5Zm9.02-4.27a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06Zm-8.48 8.48a.75.75 0 0 1 1.06 0 .75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06Zm9.54 1.06a.75.75 0 0 1 1.06-1.06l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06Zm-8.48-8.48a.75.75 0 0 1 0 1.06L6.3 10.9a.75.75 0 1 1-1.06-1.06L6.3 8.77a.75.75 0 0 1 1.06 0ZM12 8.25a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5Z"
                      fill="currentColor"
                    />
                  ) : (
                    <path
                      d="M14.97 3.92a.75.75 0 0 1 .49.98 7.1 7.1 0 1 0 3.64 9.09.75.75 0 1 1 1.41.52A8.6 8.6 0 1 1 14 3.42a.75.75 0 0 1 .97.5Z"
                      fill="currentColor"
                    />
                  )}
                </svg>
              </button>

              <span className="sidebar-link-label">{isDark ? "Dark" : "Light"}</span>
            </div>
          </div>

          <div className="sidebar-user-card">
            <div className="sidebar-role-pill" title={currentUserRole}>
              {shortenLabel(currentUserRole, 10)}
            </div>

            <div className="sidebar-user-avatar" title={currentUserName}>
              {currentUserInitials}
            </div>

            <div className="sidebar-user-name" title={currentUserName}>
              {shortenLabel(currentUserShortName, 10)}
            </div>

            <select
              className="sidebar-user-select-overlay"
              value={currentUserQuery.data?.id ?? ""}
              disabled={usersQuery.isLoading || selectUserMutation.isPending}
              onChange={event => {
                const value = event.target.value;

                if (!value) {
                  return;
                }

                selectUserMutation.mutate(value);
              }}
              aria-label="Switch signed in user"
              title="Switch signed in user"
            >
              {userOptions.map(user => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </aside>

      <main className="app-content">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
