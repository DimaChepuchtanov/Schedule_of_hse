export default function PageLoading() {
  return (
    <main className="page-status" role="status">
      <span className="page-spinner" aria-hidden="true" />
      <p>Загружаем страницу…</p>
    </main>
  );
}
