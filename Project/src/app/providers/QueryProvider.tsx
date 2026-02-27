// Імпортуємо QueryClient та QueryClientProvider з @tanstack/react-query.
// - QueryClient: "двигун" react-query, який зберігає кеш запитів, їх стани, налаштування, тощо.
// - QueryClientProvider: React-провайдер, який робить QueryClient доступним у всьому дереві компонентів
//   (щоб useQuery/useMutation могли працювати).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Імпортуємо тип PropsWithChildren та хук useState з React.
// - PropsWithChildren: допоміжний тип, який додає проп children до пропсів компонента.
// - useState: тут використовується для одноразового створення екземпляра QueryClient і збереження його
//   між ререндерами компонента.
import { PropsWithChildren, useState } from "react";

// Компонент-обгортка (Provider) для react-query.
// Його задача: створити один QueryClient та прокинути його через QueryClientProvider до всіх дочірніх компонентів.
export function QueryProvider({ children }: PropsWithChildren) {
  // Створюємо та зберігаємо екземпляр QueryClient у state.
  //
  // Важливий момент: ми використовуємо useState з "лінивою ініціалізацією" (функція-ініціалізатор),
  // щоб QueryClient створився рівно один раз при першому монтуванні компонента,
  // а НЕ на кожен ререндер.
  //
  // Деструктуризація [client] (без сеттера) означає:
  // - client зберігається стабільним,
  // - ми не плануємо змінювати його після створення (і це правильно для QueryClient).
  const [client] = useState(
    () =>
      new QueryClient({
        // defaultOptions — глобальні дефолтні налаштування для всіх запитів (queries),
        // якщо в конкретному useQuery вони не перевизначені.
        defaultOptions: {
          queries: {
            // retry: 0 — вимикаємо автоматичні повторні спроби запиту при помилці.
            // (За замовчуванням react-query може робити кілька ретраїв, що інколи небажано.)
            retry: 0,

            // refetchOnWindowFocus: false — вимикаємо автоматичний повторний запит,
            // коли користувач повертається до вкладки/вікна браузера.
            // (Корисно, якщо не хочемо несподіваних мережевих запитів при фокусі.)
            refetchOnWindowFocus: false
          }
        }
      })
  );

  // Обгортаємо всі дочірні компоненти (children) у QueryClientProvider,
  // щоб react-query хуки внизу дерева могли отримати доступ до client.
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}