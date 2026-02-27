import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "@app/layouts/AppLayout";
import { HomePage } from "@pages/home";
import { ProjectsPage } from "@pages/projects";

function RouteError() {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Navigation error</h2>
      <div className="muted">Check the console for details.</div>
    </div>
  );
}

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AppLayout />,
      errorElement: <RouteError />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "projects", element: <ProjectsPage /> },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL }
);