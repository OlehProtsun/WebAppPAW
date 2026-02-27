// Імпортуємо forwardRef та тип ButtonHTMLAttributes з React.
// - forwardRef: дозволяє "прокинути" ref з батьківського компонента прямо на DOM-елемент <button>.
//   Це корисно для фокусу, інтеграції з бібліотеками, accessibility та тестів.
// - ButtonHTMLAttributes<HTMLButtonElement>: набір стандартних пропсів HTML-кнопки
//   (type, disabled, onClick, aria-*, і т.д.) з правильною типізацією.
import { forwardRef, type ButtonHTMLAttributes } from "react";

// Опис пропсів компонента Button:
//
// Беремо всі стандартні атрибути HTML кнопки (ButtonHTMLAttributes<HTMLButtonElement>)
// і додаємо власний проп variant, який контролює стиль кнопки.
// variant опційний, дозволені значення:
// - "primary" (за замовчуванням)
// - "danger" (для небезпечних дій: delete тощо)
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "danger";
};

// Експортуємо компонент Button, який підтримує ref на <button>.
// Типізація forwardRef:
// - перший generic: тип DOM-елемента, на який вказуватиме ref (HTMLButtonElement)
// - другий generic: тип пропсів (Props)
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  // Деструктуризація пропсів:
  // - variant: наш кастомний проп, дефолт "primary"
  // - className: може прийти від користувача компонента (додаткові класи)
  // - ...props: решта стандартних HTML-атрибутів (onClick, type, disabled, тощо)
  { variant = "primary", className, ...props },

  // ref, який прийшов ззовні, і який треба прикріпити до реального DOM <button>.
  ref
) {
  // Визначаємо базові CSS-класи кнопки залежно від variant.
  //
  // Якщо variant === "danger":
  // - додаємо "btn btn-danger" (ймовірно червона/попереджувальна стилізація)
  // Інакше:
  // - просто "btn" (звичайна кнопка)
  const v = variant === "danger" ? "btn btn-danger" : "btn";

  // Повертаємо <button> з усіма переданими пропсами.
  //
  // {...props} розгортає всі стандартні атрибути кнопки, які передав користувач компонента.
  // ref={ref} прикріплює forwarded ref до DOM-елемента.
  //
  // className:
  // - об’єднуємо базові класи (v) з додатковими (className),
  // - filter(Boolean) прибирає undefined/""/null (щоб не було зайвих пробілів),
  // - join(" ") робить фінальний рядок класів.
  return <button {...props} ref={ref} className={[v, className].filter(Boolean).join(" ")} />;
});