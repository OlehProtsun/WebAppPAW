import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "@app/layouts/AppLayout";
import { ProjectProfilePage } from "@pages/project-profile";
import { ProjectsPage } from "@pages/projects";

const routeErrorElement = (
  <div className="card">
    <h2 style={{ marginTop: 0 }}>Navigation error</h2>
    <div className="muted">Check the console for details.</div>
  </div>
);

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AppLayout />,
      errorElement: routeErrorElement,
      children: [
        { index: true, element: <Navigate to="/projects" replace /> },
        { path: "projects", element: <ProjectsPage /> },
        { path: "projects/:projectId", element: <ProjectProfilePage /> },
        { path: "*", element: <Navigate to="/projects" replace /> },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  }
);
