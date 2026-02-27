// Імпортуємо тип InputHTMLAttributes з React.
// Це набір стандартних HTML-атрибутів для <input> з правильною типізацією:
// value, onChange, placeholder, type, disabled, aria-*, і т.д.
import { InputHTMLAttributes } from "react";

// Компонент Input — легка обгортка над стандартним <input>,
// яка додає базовий CSS-клас "input" і дозволяє дописувати додаткові класи через className.
//
// Функціонал НЕ змінюється: всі props прокидаються напряму в <input>.
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    // {...props} передає всі стандартні атрибути в реальний <input>.
    // className формуємо так:
    // - завжди додаємо базовий клас "input" (для спільних стилів)
    // - додаємо className, якщо він переданий ззовні
    // - filter(Boolean) прибирає undefined/null/"" щоб не було зайвих пробілів
    // - join(" ") з’єднує класи в один рядок
    <input {...props} className={["input", className].filter(Boolean).join(" ")} />
  );
}