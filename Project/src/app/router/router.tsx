// Імпортуємо createBrowserRouter та Navigate з react-router.
// - createBrowserRouter: створює router, який використовує HTML5 History API (звичайні "красиві" URL без #).
// - Navigate: компонент для програмної навігації/редіректу в декларативному стилі (рендеримо його — і відбувається перехід).
import { createBrowserRouter, Navigate } from "react-router";

// Імпортуємо компонент макету додатку (спільна "рамка": topbar + Outlet).
import { AppLayout } from "@app/layouts/AppLayout";

// Імпортуємо сторінки (route components).
// Це компоненти, які рендеряться в залежності від URL.
import { HomePage } from "@pages/home";
import { ProjectsPage } from "@pages/projects";

// Елемент, який буде показано у випадку помилки навігації/маршрутизації.
// У react-router errorElement використовується для відображення помилок,
// які виникають під час рендеру маршруту або під час завантаження даних (якщо використовуються loaders/actions).
//
// Тут це просто невелика "картка" з повідомленням і підказкою дивитись консоль.
const routeErrorElement = (
  <div className="card">
    {/* Заголовок помилки навігації */}
    <h2 style={{ marginTop: 0 }}>Navigation error</h2>

    {/* Додатковий опис (muted — імовірно сірий/приглушений стиль у CSS) */}
    <div className="muted">Check the console for details.</div>
  </div>
);

// Експортуємо налаштований router, щоб використовувати його в RouterProvider (зазвичай в main.tsx/app entry).
export const router = createBrowserRouter(
  [
    // Кореневий маршрут додатку.
    {
      // path "/" означає, що це базовий шлях для цього сегмента.
      path: "/",

      // element — React-елемент, який рендериться для цього маршруту.
      // AppLayout зазвичай містить навігацію і <Outlet />, куди "вставляються" дочірні сторінки.
      element: <AppLayout />,

      // errorElement — UI, який показується замість element/children, якщо сталася помилка.
      errorElement: routeErrorElement,

      // children — вкладені маршрути.
      // Оскільки AppLayout містить <Outlet />, сюди будуть рендеритися дочірні сторінки.
      children: [
        // index: true — "індексний" маршрут.
        // Він рендериться, коли шлях точно відповідає батьківському "/" (тобто просто головна сторінка).
        { index: true, element: <HomePage /> },

        // path: "projects" — дочірній шлях відносно батьківського "/".
        // У результаті виходить маршрут "/projects".
        { path: "projects", element: <ProjectsPage /> },

        // path: "*" — "catch-all" маршрут (будь-який шлях, що не збігся з попередніми).
        // Тут ми робимо редірект на "/" і replace=true:
        // - replace означає: замінити поточний запис в історії, щоб користувач не "повертався" на неіснуючу сторінку кнопкою Back.
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
  {
    // basename — базовий шлях, від якого будуть будуватися всі маршрути.
    // Корисно, коли додаток деплоїться не в корені домену, а в підкаталозі.
    //
    // import.meta.env.BASE_URL — значення з оточення збірника (наприклад, Vite),
    // яке зазвичай відповідає base/public path застосунку.
    basename: import.meta.env.BASE_URL,
  }
);