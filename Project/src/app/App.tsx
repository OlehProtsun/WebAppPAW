// Імпортуємо RouterProvider з react-router.
// RouterProvider — це компонент, який "підключає" створений router до React-додатку.
// Він відповідає за:
// - відстеження поточного URL,
// - рендер правильних маршрутів,
// - обробку навігації та помилок маршрутизації (errorElement),
// - підтримку вкладених маршрутів через Outlet (всередині відповідних route element).
import { RouterProvider } from "react-router";

// Імпортуємо наш налаштований router (створений через createBrowserRouter).
// Він містить всю конфігурацію маршрутів додатку.
import { router } from "./router/router";

// Кореневий компонент додатку.
// Його головна задача — віддати управління маршрутизацією RouterProvider,
// передавши йому router з конфігурацією шляхів і сторінок.
export function App() {
  // Рендеримо RouterProvider з нашим router.
  // Далі вже router визначає, який layout/сторінку показувати залежно від URL.
  return <RouterProvider router={router} />;
}