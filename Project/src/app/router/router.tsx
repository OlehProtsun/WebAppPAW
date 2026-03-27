import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "@app/layouts/AppLayout";
import { ProjectProfilePage } from "@pages/project-profile";
import { ProjectsPage } from "@pages/projects";
import { StoryProfilePage } from "@pages/story-profile";
import { TaskDetailsPage } from "@pages/task-details";
import { ErrorCard } from "@shared/ui/PageState";

const routeErrorElement = <ErrorCard title="Navigation error" />;

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
        { path: "projects/:projectId/stories/:storyId", element: <StoryProfilePage /> },
        { path: "projects/:projectId/tasks/:taskId", element: <TaskDetailsPage /> },
        { path: "*", element: <Navigate to="/projects" replace /> },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  }
);
