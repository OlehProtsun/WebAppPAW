import { createBrowserRouter, Navigate } from "react-router";
import { ProjectsPage } from "@pages/projects";

function RouteError() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Router error / No match</h1>
      <p>Open DevTools Console — will be issue.</p>
    </div>
  );
}

export const router = createBrowserRouter(
  [
    { path: "/", element: <ProjectsPage />, errorElement: <RouteError /> },
    { path: "*", element: <Navigate to="/" replace /> },
  ],
  { basename: import.meta.env.BASE_URL }
);