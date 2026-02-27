// Імпортуємо тип TextareaHTMLAttributes з React.
// Це набір стандартних HTML-атрибутів для <textarea> з правильною типізацією:
// value, onChange, rows, placeholder, disabled, aria-*, і т.д.
import { TextareaHTMLAttributes } from "react";

// Компонент Textarea — легка обгортка над стандартним <textarea>,
// яка додає базовий CSS-клас "textarea" і дозволяє додавати додаткові класи через className.
//
// Функціонал не змінюється: всі props прокидаються напряму в <textarea>.
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    // {...props} передає всі атрибути у DOM-елемент <textarea>.
    // className формуємо так:
    // - базовий клас "textarea" завжди присутній (спільні стилі)
    // - className додається лише якщо переданий ззовні
    // - filter(Boolean) прибирає порожні значення
    // - join(" ") склеює у фінальний рядок класів
    <textarea {...props} className={["textarea", className].filter(Boolean).join(" ")} />
  );
}