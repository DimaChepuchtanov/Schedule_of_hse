import { Link } from "react-router";

/** Optional shared frame for new pages; authentication keeps its own layout. */
export default function PageLayout({ title, description, children }) {
  return (
    <main className="page-layout">
      <header className="page-layout__header">
        <Link className="page-layout__brand" to="/">Расписание.</Link>
        <Link to="/auth/">Учётная запись</Link>
      </header>
      <section className="page-layout__content">
        <h1>{title}</h1>
        {description && <p className="page-layout__description">{description}</p>}
        {children}
      </section>
    </main>
  );
}
