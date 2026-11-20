import { formatWeek, getModules } from "../model.js";
import Icon from "./Icon.jsx";

export default function ScheduleFilters({
  versions, selected, onModule, onKind, onWeek,
}) {
  const modules = getModules(versions);
  const inModule = versions.filter((version) => version.module_id === selected.module_id);
  const kinds = new Set(inModule.map((version) => version.kind));
  const weeks = inModule.filter((version) => version.kind === "WEEKLY")
    .sort((a, b) => b.week_start.localeCompare(a.week_start));

  return (
    <section className="sp-periods" aria-label="Выбор расписания">
      <div className="sp-periods__intro">
        <span className="sp-soft-icon"><Icon name="calendar" size={21} /></span>
        <div><strong>Выберите расписание</strong><span>Доступные публикации учебной части</span></div>
      </div>
      <div className="sp-periods__fields">
        <label className="sp-field">
          <span>Учебный модуль</span>
          <select
            value={selected.module_id}
            onChange={(event) => onModule(Number(event.target.value))}
          >
            {modules.map((module) => <option key={module.id} value={module.id}>{module.label}</option>)}
          </select>
        </label>
        <label className="sp-field">
          <span>Тип расписания</span>
          <select value={selected.kind} onChange={(event) => onKind(event.target.value)}>
            {kinds.has("WEEKLY") && <option value="WEEKLY">На неделю</option>}
            {kinds.has("BASE") && <option value="BASE">Базовое на модуль</option>}
          </select>
        </label>
        <label className="sp-field sp-field--week">
          <span>{selected.kind === "BASE" ? "Период" : "Учебная неделя"}</span>
          <select
            value={selected.kind === "BASE" ? "base" : selected.uuid}
            disabled={selected.kind === "BASE"}
            onChange={(event) => onWeek(event.target.value)}
          >
            {selected.kind === "BASE"
              ? <option value="base">Типовая неделя модуля</option>
              : weeks.map((version) => (
                <option key={version.uuid} value={version.uuid}>
                  {formatWeek(version.week_start)}
                </option>
              ))}
          </select>
        </label>
      </div>
    </section>
  );
}
