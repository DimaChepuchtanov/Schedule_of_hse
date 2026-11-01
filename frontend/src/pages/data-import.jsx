import { useState } from "react";
import PageLayout from "../shared/layouts/PageLayout.jsx";

const TYPES = {
  groups: { title: "Группы", columns: ["Группа"], blank: { Группа: "" } },
  teachers: {
    title: "Преподаватели",
    columns: ["Фамилия", "Имя", "Отчество", "Должность"],
    blank: { Фамилия: "", Имя: "", Отчество: "", Должность: "" },
  },
  availability: {
    title: "Доступность преподавателей",
    columns: ["Фамилия", "Имя", "Отчество", "Дни недели"],
    blank: { Фамилия: "", Имя: "", Отчество: "", "Дни недели": [] },
  },
};

const emptyPreview = { groups: [], teachers: [], availability: [] };
const weekdays = [
  "Понедельник", "Вторник", "Среда", "Четверг",
  "Пятница", "Суббота", "Воскресенье",
];
const initialRows = Object.fromEntries(
  Object.entries(TYPES).map(([key, type]) => [key, [{ ...type.blank }]]),
);

async function validateImport(formData) {
  const csrfResponse = await fetch("/api/csrf/", {
    credentials: "include",
    cache: "no-store",
  });
  if (!csrfResponse.ok) throw new Error("Не удалось подготовить проверку.");
  const { csrfToken } = await csrfResponse.json();
  const response = await fetch("/api/data-import/", {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: { "X-CSRFToken": csrfToken },
  });
  const data = await response.json();
  if (!response.ok && !data.errors) throw new Error("Не удалось проверить данные.");
  return data;
}

function DataTable({ title, columns, rows }) {
  return (
    <section className="import-preview__section">
      <h2>{title} <span>({rows.length})</span></h2>
      <div className="import-preview__table-wrap">
        <table>
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => (
            <tr key={`${title}-${index}`}>{columns.map((column) => (
          <td key={column}>{Array.isArray(row[column]) ? row[column].join(", ") : row[column]}</td>
            ))}</tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

function EditableTable({ type, rows, onChange }) {
  const { columns } = TYPES[type];
  function updateRow(index, column, value) {
    const next = rows.map((row, rowIndex) => rowIndex === index ? { ...row, [column]: value } : row);
    onChange(next);
  }
  return (
    <div className="manual-table-wrap">
      <table className="manual-table">
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}<th aria-label="Действия" /></tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column}>
                  {type === "availability" && column === "Дни недели" ? (
                    <div className="weekday-picker">
                      {weekdays.map((day) => (
                        <label key={day}>
                          <input
                            type="checkbox"
                            checked={row[column].includes(day)}
                            onChange={(event) => {
                              const selected = event.target.checked
                                ? [...row[column], day]
                                : row[column].filter((value) => value !== day);
                              updateRow(index, column, selected);
                            }}
                          />
                          {day}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      value={row[column]}
                      onChange={(event) => updateRow(index, column, event.target.value)}
                    />
                  )}
                </td>
              ))}
              <td><button type="button" className="manual-table__remove" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>Удалить</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="manual-table__add" onClick={() => onChange([...rows, { ...TYPES[type].blank }])}>+ Добавить строку</button>
    </div>
  );
}

export default function DataImportPage() {
  const [source, setSource] = useState("xlsx");
  const [dataType, setDataType] = useState("groups");
  const [manualType, setManualType] = useState("groups");
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(initialRows);
  const [preview, setPreview] = useState(emptyPreview);
  const [errors, setErrors] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function selectSource(nextSource) {
    setSource(nextSource);
    setErrors([]);
    setMessage("");
    setPreview(emptyPreview);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    setMessage("");
    const formData = new FormData();
    formData.set("source", source);
    if (source === "xlsx") {
      formData.set("data_type", dataType);
      if (file) formData.set("file", file);
    } else {
      formData.set("rows", JSON.stringify(rows));
    }
    try {
      const data = await validateImport(formData);
      setPreview(data.payload || emptyPreview);
      setErrors(data.errors || []);
      setMessage(data.message || "");
    } catch (error) {
      setErrors([error.message]);
      setPreview(emptyPreview);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageLayout title="Выгрузка исходных данных" description="Загрузите данные и проверьте их перед добавлением в систему.">
      <form className="data-import" onSubmit={handleSubmit}>
        <div className="data-import__tabs" role="group" aria-label="Источник данных">
          <button type="button" className={source === "xlsx" ? "is-active" : ""} onClick={() => selectSource("xlsx")}>Excel-файл</button>
          <button type="button" className={source === "manual" ? "is-active" : ""} onClick={() => selectSource("manual")}>Ручной ввод</button>
        </div>

        {source === "xlsx" ? (
          <div className="data-import__file">
            <label htmlFor="xlsx-type">Тип данных</label>
            <select id="xlsx-type" value={dataType} onChange={(event) => setDataType(event.target.value)}>
              {Object.entries(TYPES).map(([key, type]) => <option key={key} value={key}>{type.title}</option>)}
            </select>
            <label htmlFor="import-file">Файл .xlsx</label>
            <input id="import-file" type="file" accept=".xlsx" onChange={(event) => setFile(event.target.files[0] || null)} />
            <p>Файл должен содержать один лист с названием «{TYPES[dataType].title}» и точными заголовками соответствующего типа. Дни недели указываются через запятую.</p>
            <div className="data-import__examples">
              <label>Пример выбранного типа</label>
              <a className="page-button" href={`/api/data-import/examples/${dataType}/`}>Скачать пример: {TYPES[dataType].title}</a>
            </div>
          </div>
        ) : (
          <div className="data-import__manual">
            <div className="data-import__tabs data-import__tabs--inner" role="group" aria-label="Тип ручного ввода">
              {Object.entries(TYPES).map(([key, type]) => (
                <button key={key} type="button" className={manualType === key ? "is-active" : ""} onClick={() => setManualType(key)}>{type.title}</button>
              ))}
            </div>
            <fieldset>
              <legend>{TYPES[manualType].title}</legend>
              <EditableTable type={manualType} rows={rows[manualType]} onChange={(value) => setRows({ ...rows, [manualType]: value })} />
            </fieldset>
            <p>Заполните нужные строки и нажмите «Проверить и показать».</p>
          </div>
        )}

        <button className="page-button" type="submit" disabled={busy}>{busy ? "Проверяем..." : "Проверить и показать"}</button>
      </form>

      {errors.length > 0 && <div className="import-result import-result--error"><h2>Проверка не пройдена</h2><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
      {message && !errors.length && <p className="import-result import-result--success">{message}</p>}
      {!errors.length && (preview.groups.length || preview.teachers.length || preview.availability.length) > 0 && (
        <div className="import-preview">
          <h2>Проверенные данные</h2>
          {preview.groups.length > 0 && <DataTable title="Группы" columns={TYPES.groups.columns} rows={preview.groups} />}
          {preview.teachers.length > 0 && <DataTable title="Преподаватели" columns={TYPES.teachers.columns} rows={preview.teachers} />}
          {preview.availability.length > 0 && <DataTable title="Доступность преподавателей" columns={TYPES.availability.columns} rows={preview.availability} />}
        </div>
      )}
    </PageLayout>
  );
}
