// Компонент головної сторінки (HomePage).
// Це простий "статичний" екран-привітання, який:
// - показує назву сторінки,
// - дає коротку інструкцію користувачу,
// - перелічує доступні модулі/фічі в застосунку.
export function HomePage() {
  return (
    // "stack" — клас для вертикального розташування блоків один під одним (ймовірно flex/column + gap у CSS).
    <div className="stack">
      {/* Перша картка: заголовок та короткий опис */}
      <div className="card">
        {/* Заголовок сторінки.
            style={{ margin: 0 }} прибирає стандартні відступи h1, щоб краще вписати в дизайн картки. */}
        <h1 style={{ margin: 0 }}>Home</h1>

        {/* Пояснювальний текст (muted — "приглушений" стиль).
            marginTop: 8 додає невеликий відступ від заголовка. */}
        <p className="muted" style={{ marginTop: 8 }}>
          Home page. Use tabs above to open features.
        </p>
      </div>

      {/* Друга картка: список доступних модулів */}
      <div className="card">
        {/* Підзаголовок секції зі списком модулів */}
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Available modules</div>

        {/* Список наразі доступних фіч.
            Тут використано просто текст з маркером "•", а не <ul>, ймовірно для простішого контролю стилів. */}
        <div className="muted">• Projects (CRUD via localStorage)</div>
      </div>
    </div>
  );
}