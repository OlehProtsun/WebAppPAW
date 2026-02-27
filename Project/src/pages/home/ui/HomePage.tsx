export function HomePage() {
  return (
    <div className="stack">
      <div className="card">
        <h1 style={{ margin: 0 }}>Home</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Home page. Use tabs above to open features.
        </p>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Available modules</div>
        <div className="muted">• Projects (CRUD via localStorage)</div>
      </div>
    </div>
  );
}