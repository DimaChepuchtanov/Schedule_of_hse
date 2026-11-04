import { useState } from "react";
import PageLayout from "../shared/layouts/PageLayout.jsx";

const TYPES = {
  directions: {
    title: "Направления",
    tabs: {
      groups: ["Направление", "Курс", "Код группы", "Код подгруппы", "Численность"],
      study_plan: ["Предмет", "Направление", "Курс", "Вид занятия", "Для кого", "Часы", "Требования к аудитории"],
    },
  },
  workload: {
    title: "Нагрузка",
    tabs: {
      workload: ["Предмет", "Код преподавателя", "Преподаватель", "Лекции, часы", "Семинары, часы", "Ограничения", "Направление", "Курс"],
    },
  },
};

const emptyPreview = { groups: [], study_plan: [], workload: [] };
const initialRows = Object.fromEntries(
  Object.entries(TYPES).flatMap(([type, definition]) =>
    Object.entries(definition.tabs).map(([key, columns]) => [
      key,
      [Object.fromEntries(columns.map((column) => [column, ""]))],
    ]),
  ),
);

async function validateImport(formData) {
  const csrf = await fetch("/api/csrf/", { credentials: "include", cache: "no-store" });
  if (!csrf.ok) throw new Error("Не удалось подготовить проверку.");
  const { csrfToken } = await csrf.json();
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

function EditableTable({ columns, rows, onChange }) {
  function update(index, column, value) {
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [column]: value } : row));
  }
  return (
    <div className="manual-table-wrap">
      <table className="manual-table">
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}<th /></tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column}>
                  <input value={row[column]} onChange={(event) => update(index, column, event.target.value)} />
                </td>
              ))}
              <td><button type="button" className="manual-table__remove" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>Удалить</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="manual-table__add" onClick={() => onChange([...rows, Object.fromEntries(columns.map((column) => [column, ""]))])}>+ Добавить строку</button>
    </div>
  );
}

function PreviewTable({ title, columns, rows }) {
  if (!rows.length) return null;
  return (
    <section className="import-preview__section">
      <h2>{title} <span>({rows.length})</span></h2>
      <div className="import-preview__table-wrap">
        <table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{row[column]}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

export default function DataImportPage() {
  const [source, setSource] = useState("xlsx");
  const [fileType, setFileType] = useState("directions");
  const [manualTab, setManualTab] = useState("groups");
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(initialRows);
  const [preview, setPreview] = useState(emptyPreview);
  const [errors, setErrors] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const definition = TYPES[fileType];
  const manualTabs = Object.entries(definition.tabs);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    setMessage("");
    const formData = new FormData();
    formData.set("source", source);
    if (source === "xlsx") {
      formData.set("data_type", fileType);
      if (file) formData.set("file", file);
    } else {
      formData.set("data_type", fileType);
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

  function changeSource(value) {
    setSource(value);
    setErrors([]);
    setMessage("");
    setPreview(emptyPreview);
  }

  return (
    <PageLayout title="Выгрузка исходных данных" description="Загрузите данные и проверьте их перед добавлением в систему.">
      <form className="data-import" onSubmit={submit}>
        <div className="data-import__tabs">
          <button type="button" className={source === "xlsx" ? "is-active" : ""} onClick={() => changeSource("xlsx")}>Excel-файл</button>
          <button type="button" className={source === "manual" ? "is-active" : ""} onClick={() => changeSource("manual")}>Ручной ввод</button>
        </div>
        {source === "xlsx" ? (
          <div className="data-import__file">
            <label htmlFor="file-type">Тип файла</label>
            <select id="file-type" value={fileType} onChange={(event) => { setFileType(event.target.value); setManualTab(Object.keys(TYPES[event.target.value].tabs)[0]); }}>
              {Object.entries(TYPES).map(([key, value]) => <option key={key} value={key}>{value.title}</option>)}
            </select>
            <label htmlFor="import-file">Файл .xlsx</label>
            <input id="import-file" type="file" accept=".xlsx" onChange={(event) => setFile(event.target.files[0] || null)} />
            <p>{fileType === "directions" ? "Листы: «Группы» и «Учебный план»." : "Лист: «Нагрузка»."} Структура и заголовки проверяются строго.</p>
            <a className="page-button" href={`/api/data-import/examples/${fileType}/`}>Скачать пример: {definition.title}</a>
          </div>
        ) : (
          <div className="data-import__manual">
            <label htmlFor="manual-file-type">Тип файла</label>
            <select id="manual-file-type" value={fileType} onChange={(event) => { setFileType(event.target.value); setManualTab(Object.keys(TYPES[event.target.value].tabs)[0]); }}>
              {Object.entries(TYPES).map(([key, value]) => <option key={key} value={key}>{value.title}</option>)}
            </select>
            <div className="data-import__tabs data-import__tabs--inner">
              {manualTabs.map(([key, columns]) => <button type="button" key={key} className={manualTab === key ? "is-active" : ""} onClick={() => setManualTab(key)}>{key === "groups" ? "Группы" : key === "study_plan" ? "Учебный план" : "Нагрузка"}</button>)}
            </div>
            <fieldset>
              <legend>{manualTabs.find(([key]) => key === manualTab)?.[0] === "groups" ? "Группы" : manualTab === "study_plan" ? "Учебный план" : "Нагрузка"}</legend>
              <EditableTable columns={definition.tabs[manualTab]} rows={rows[manualTab]} onChange={(value) => setRows({ ...rows, [manualTab]: value })} />
            </fieldset>
          </div>
        )}
        <button className="page-button" type="submit" disabled={busy}>{busy ? "Проверяем..." : "Проверить и показать"}</button>
      </form>
      {errors.length > 0 && <div className="import-result import-result--error"><h2>Проверка не пройдена</h2><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
      {message && !errors.length && <p className="import-result import-result--success">{message}</p>}
      {!errors.length && (preview.groups.length || preview.study_plan.length || preview.workload.length) > 0 && (
        <div className="import-preview">
          <h2>Проверенные данные</h2>
          <PreviewTable title="Группы" columns={TYPES.directions.tabs.groups} rows={preview.groups} />
          <PreviewTable title="Учебный план" columns={TYPES.directions.tabs.study_plan} rows={preview.study_plan} />
          <PreviewTable title="Нагрузка" columns={TYPES.workload.tabs.workload} rows={preview.workload} />
        </div>
      )}
    </PageLayout>
  );
}
