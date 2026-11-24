function cellValue(row, key) {
  const value = row[key];
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  return value ?? "—";
}

export default function DirectoryTable({ definition, rows }) {
  const titleId = `directory-${definition.key}`;
  return (
    <section className="directories__detail" aria-labelledby={titleId}>
      <header className="directories__heading">
        <h2 id={titleId}>{definition.title}</h2>
        <span>Записей: {rows.length}</span>
      </header>
      <p className="directories__description">{definition.description}</p>
      {definition.note && <p className="directories__note">{definition.note}</p>}
      {rows.length ? (
        <div className="directories__wrap" role="region" aria-labelledby={titleId} tabIndex={0}>
          <table>
            <caption className="directories__sr-only">{definition.title}</caption>
            <thead>
              <tr>{definition.columns.map(([key, title]) => <th key={key} scope="col">{title}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {definition.columns.map(([key]) => <td key={key}>{cellValue(row, key)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="directories__empty" role="status">В этом справочнике пока нет записей.</p>}
    </section>
  );
}
