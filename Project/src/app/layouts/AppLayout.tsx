import { NavLink, Outlet } from "react-router";

const tabs = [
  { to: "/", label: "Home", end: true },
  { to: "/projects", label: "Projects" },
];

export function AppLayout() {
  return (
    <div>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="tabs">
            {tabs.map(t => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end as any}
                className={({ isActive }) => `tab ${isActive ? "tab-active" : ""}`}
              >
                {t.label}
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingTop: 18 }}>
        <Outlet />
      </main>
    </div>
  );
}