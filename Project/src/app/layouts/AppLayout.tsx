import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, useNavigate } from "react-router";
import { CurrentUserManager, UsersApi } from "@entities/user";
import { LocalStorageClient } from "@shared/api/localStorageClient";
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

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-inner">
          <div className="sidebar-nav">
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
