import { useEffect, useState } from "react";

const TABLES = [
  {
    key: "universities",
    title: "Вуз",
    columns: [
      ["name", "Название"],
      ["timezone", "Часовой пояс"],
      ["pair_minutes", "Пара, мин"],
      ["academic_hour_minutes", "Академический час, мин"],
      ["transfer_minutes", "Переход, мин"],
    ],
  },
  {
    key: "buildings",
    title: "Корпуса",
    columns: [
      ["name", "Корпус"],
      ["address", "Адрес"],
      ["university", "Вуз"],
    ],
  },
  {
    key: "rooms",
    title: "Аудитории",
    columns: [
      ["building", "Корпус"],
      ["number", "Номер"],
      ["capacity", "Вместимость"],
      ["room_type", "Тип"],
      ["is_active", "Активна"],
    ],
  },
  {
    key: "time_slots",
    title: "Пары",
    columns: [
      ["number", "Номер"],
      ["starts_at", "Начало"],
      ["ends_at", "Конец"],
    ],
  },
  {
    key: "modules",
    title: "Учебные модули",
    columns: [
      ["number", "Модуль"],
      ["academic_year", "Год начала"],
      ["starts_on", "Начало занятий"],
      ["ends_on", "Конец занятий"],
    ],
  },
];

function cellValue(row, key) {
  const value = row[key];
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  return value ?? "";
}

export default function DirectoriesSection() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/reference/", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.errors?.[0] || "Не удалось загрузить справочники.");
        return payload;
      })
      .then((payload) => {
        if (!controller.signal.aborted) setData(payload);
      })
      .catch((failure) => {
        if (!controller.signal.aborted && failure.name !== "AbortError") setError(failure.message);
      });
    return () => controller.abort();
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Загружаем справочники…</p>;

  return (
    <div className="directories">
      <p>Вместимость аудиторий пока указана как 50 мест, так как открытой цифры по кампусу нет.</p>
      {TABLES.map((table) => (
        <section key={table.key}>
          <h2>{table.title} <span>({data[table.key]?.length || 0})</span></h2>
          {data[table.key]?.length ? (
            <div className="directories__wrap">
              <table>
                <thead>
                  <tr>{table.columns.map(([, title]) => <th key={title}>{title}</th>)}</tr>
                </thead>
                <tbody>
                  {data[table.key].map((row) => (
                    <tr key={row.id}>
                      {table.columns.map(([key]) => <td key={key}>{cellValue(row, key)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p>Записей нет.</p>}
        </section>
      ))}
    </div>
  );
}
