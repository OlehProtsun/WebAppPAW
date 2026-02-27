// Імпортуємо useEffect та useRef з React.
// - useRef: зберігає посилання (ref) на DOM-елементи (кнопку підтвердження та сам діалог)
// - useEffect: підписка на події (Escape) та керування фокусом при відкритті діалогу
import { useEffect, useRef } from "react";

// createPortal дозволяє рендерити React-елемент в інше місце DOM-дерева,
// ніж поточний батьківський компонент.
// Для модалок це стандартно: рендеримо в document.body, щоб:
// - не залежати від overflow/position контекстів батьків,
// - уникнути проблем зі z-index,
// - мати передбачуваний шар поверх усього UI.
import { createPortal } from "react-dom";

// Використовуємо наш спільний компонент Button.
import { Button } from "./Button";

// Тип пропсів ConfirmDialog.
// Це модальне вікно підтвердження дії (наприклад, видалення).
type ConfirmDialogProps = {
  // open: чи діалог відкритий (true) чи закритий (false).
  open: boolean;

  // title: заголовок діалогу (обов’язковий).
  title: string;

  // description: додатковий опис (опційний).
  description?: string;

  // Тексти кнопок.
  confirmText: string;
  cancelText: string;

  // loading: стан виконання дії (наприклад, видалення на сервері).
  // Якщо true — кнопки зазвичай блокуються, а confirm може показувати інший текст.
  loading?: boolean;

  // danger: якщо true — підтверджуюча кнопка стилізується як "небезпечна" (червона).
  danger?: boolean;

  // onConfirm: колбек, який викликається при підтвердженні.
  onConfirm: () => void;

  // onCancel: колбек, який викликається при скасуванні (закритті) діалогу.
  onCancel: () => void;
};

// Компонент ConfirmDialog — модальне підтвердження.
// Функціонал:
// - рендериться тільки коли open=true
// - закривається по Escape
// - закривається по кліку на бекдроп (поза вікном)
// - при відкритті ставить фокус на confirm-кнопку (або на діалог, якщо кнопка ще не доступна)
// - рендериться через портал у document.body
export function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText,
  loading = false,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // ref на кнопку підтвердження, щоб при відкритті модалки одразу фокусувати її.
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  // ref на контейнер діалогу (div), який може прийняти фокус як fallback.
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Ефект, який спрацьовує при відкритті/закритті діалогу.
  useEffect(() => {
    // Якщо діалог закритий — нічого не робимо (не додаємо слухачі, не фокусуємо).
    if (!open) return;

    // Обробник клавіш:
    // при натисканні Escape — закриваємо діалог через onCancel.
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    // Підписуємося на keydown на window, щоб ловити Escape незалежно від фокусу всередині.
    window.addEventListener("keydown", keyHandler);

    // Керування фокусом при відкритті:
    // 1) якщо confirm-кнопка вже існує в DOM — фокусуємо її (зручно для швидкого підтвердження Enter).
    // 2) інакше фокусуємо контейнер діалогу (fallback), щоб:
    //    - фокус не залишався "під" модалкою,
    //    - працювала клавіатурна навігація/доступність.
    if (confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    } else {
      dialogRef.current?.focus();
    }

    // Cleanup: при закритті діалогу або зміні залежностей — прибираємо слухач.
    return () => {
      window.removeEventListener("keydown", keyHandler);
    };
  }, [open, onCancel]); // залежимо від open та onCancel, щоб мати актуальний колбек

  // Якщо діалог не відкритий — нічого не рендеримо.
  // Це важливо: портал і бекдроп не повинні існувати в DOM, коли open=false.
  if (!open) return null;

  // Рендеримо модалку через портал у document.body.
  return createPortal(
    // Backdrop — затемнення фону + зона кліку поза діалогом.
    <div
      className="confirm-dialog-backdrop"
      onClick={event => {
        // Закриваємо діалог лише якщо клікнули саме по бекдропу,
        // а не по елементах всередині діалогу.
        //
        // event.currentTarget — елемент, на якому висить обробник (бекдроп),
        // event.target — фактичний елемент, по якому клікнули.
        // Якщо вони рівні — клікнули "в порожнє місце" бекдропа.
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      {/* Вікно діалогу */}
      <div
        className="confirm-dialog"
        // role="dialog" + aria-modal="true" — підказки для скрінрідерів, що це модальний діалог.
        role="dialog"
        aria-modal="true"
        // aria-labelledby вказує на id заголовка, який описує діалог.
        aria-labelledby="confirm-dialog-title"
        // ref на контейнер діалогу (для фокусу fallback)
        ref={dialogRef}
        // tabIndex={-1} робить div фокусованим програмно (через .focus()),
        // але не додає його в стандартний tab-порядок.
        tabIndex={-1}
      >
        {/* Заголовок діалогу. id використовується aria-labelledby */}
        <h3 id="confirm-dialog-title" className="confirm-dialog-title">
          {title}
        </h3>

        {/* Опис показуємо лише якщо він переданий */}
        {description && <p className="confirm-dialog-description">{description}</p>}

        {/* Кнопки дій */}
        <div className="confirm-dialog-actions">
          {/* Cancel-кнопка:
              - type="button" щоб не сабмітити випадково форму, якщо діалог всередині form-контексту
              - disabled при loading, щоб не переривати/дублювати дію */}
          <Button type="button" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>

          {/* Confirm-кнопка:
              - ref потрібен для автофокусу
              - variant залежить від danger (danger => червона)
              - disabled при loading
              - текст змінюється при loading (показуємо процес) */}
          <Button
            ref={confirmButtonRef}
            type="button"
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : confirmText}
          </Button>
        </div>
      </div>
    </div>,
    // Місце в DOM, куди монтуємо портал: body.
    document.body
  );
}