import { useMemo, useState } from "react";
import {
  chooseDefaultVersion, filterEntries, formatDate, formatWeek,
  groupsForCourse, isDate, moduleLabel, mondayISO, todayISO,
} from "./model.js";
import { usePublications, usePublishedSchedule } from "./hooks/usePublishedSchedules.js";
import Icon from "./components/Icon.jsx";
import LessonDialog from "./components/LessonDialog.jsx";
import ScheduleFilters from "./components/ScheduleFilters.jsx";
import ScheduleState from "./components/ScheduleState.jsx";
import Timetable from "./components/Timetable.jsx";
import "./schedule.css";

function Brand() {
  return (
    <div className="sp-brand" aria-label="Schedule HSE">
      <span className="sp-brand__mark"><Icon name="calendar" size={23} /></span>
      <span>Schedule<span className="sp-brand__dot">.</span><small>HSE</small></span>
    </div>
  );
}

function PublicationDate({ value }) {
  if (!value || Number.isNaN(new Date(value).valueOf())) return null;
  const date = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
  return <span>Опубликовано {date}</span>;
}

function ScheduleContent({ data, version, versions, onSelect }) {
  const [course, setCourse] = useState(data.courses[0]?.name || "");
  const [group, setGroup] = useState(groupsForCourse(data, data.courses[0]?.name || "")[0] || "");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState(() => window.matchMedia("(max-width: 740px)").matches ? "day" : "week");
  const [day, setDay] = useState(() => (
    data.days.find((item) => item.date === todayISO())?.date || data.days[0]?.date || ""
  ));
  const [openedLesson, setOpenedLesson] = useState(null);
  const base = version.kind === "BASE";
  const groups = useMemo(() => groupsForCourse(data, course), [data, course]);
  const entries = useMemo(() => filterEntries(data, { course, group, query }), [data, course, group, query]);
  const weeks = useMemo(() => versions.filter((item) => (
    item.module_id === version.module_id && item.kind === "WEEKLY"
  )).sort((a, b) => a.week_start.localeCompare(b.week_start)), [versions, version.module_id]);
  const index = weeks.findIndex((item) => item.uuid === version.uuid);
  const monday = mondayISO();
  const periodLabel = base
    ? "Типовая неделя"
    : version.week_start === monday
      ? "Текущая неделя"
      : version.week_start < monday ? "Архивная неделя" : "Будущая неделя";

  function changeCourse(value) {
    setCourse(value);
    const available = groupsForCourse(data, value);
    setGroup((previous) => available.includes(previous) ? previous : available[0] || "");
  }

  function resetFilters() {
    setCourse("");
    setGroup("");
    setQuery("");
  }

  return (
    <>
      <section className="sp-student-filters" aria-label="Фильтры занятий">
        <label className="sp-field">
          <span>Курс</span>
          <select value={course} onChange={(event) => changeCourse(event.target.value)}>
            <option value="">Все курсы</option>
            {data.courses.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
          </select>
        </label>
        <label className="sp-field">
          <span>Учебная группа</span>
          <select value={group} onChange={(event) => setGroup(event.target.value)}>
            <option value="">Все группы</option>
            {groups.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="sp-field sp-search">
          <span>Поиск по расписанию</span>
          <span className="sp-search__input">
            <Icon name="search" size={18} />
            <input
              type="search"
              value={query}
              placeholder="Предмет, преподаватель, аудитория"
              onChange={(event) => setQuery(event.target.value)}
              maxLength={250}
            />
          </span>
        </label>
      </section>

      <section className="sp-calendar" aria-label="Занятия">
        <div className="sp-calendar__toolbar">
          <div className="sp-calendar__period">
            {!base && (
              <div className="sp-week-arrows">
                <button
                  className="sp-icon-button"
                  type="button"
                  aria-label="Предыдущая опубликованная неделя"
                  disabled={index <= 0}
                  onClick={() => onSelect(weeks[index - 1].uuid)}
                ><Icon name="left" /></button>
                <button
                  className="sp-icon-button"
                  type="button"
                  aria-label="Следующая опубликованная неделя"
                  disabled={index < 0 || index >= weeks.length - 1}
                  onClick={() => onSelect(weeks[index + 1].uuid)}
                ><Icon name="right" /></button>
              </div>
            )}
            <div>
              <div className="sp-calendar__caption">{periodLabel}</div>
              <h2>{base ? "Базовое расписание" : formatWeek(version.week_start)}</h2>
            </div>
          </div>
          <div className="sp-view-toggle" aria-label="Вид расписания">
            <button type="button" aria-pressed={mode === "week"} onClick={() => setMode("week")}>
              <Icon name="grid" size={15} />Неделя
            </button>
            <button type="button" aria-pressed={mode === "day"} onClick={() => setMode("day")}>
              <Icon name="list" size={16} />День
            </button>
          </div>
        </div>

        {mode === "day" && data.days.length > 0 && (
          <div className="sp-day-tabs" aria-label="Выберите день">
            {data.days.map((item) => (
              <button
                type="button"
                key={item.date}
                aria-pressed={day === item.date}
                onClick={() => setDay(item.date)}
              >
                <span>{item.name}</span>
                {!base && isDate(item.date) && <small>{formatDate(item.date, { month: "short" })}</small>}
              </button>
            ))}
          </div>
        )}

        <div className="sp-calendar__summary" aria-live="polite">
          <span><span className="sp-status-dot" />{group || (course ? "Все группы · " + course : "Все группы")}</span>
          <span>Занятий: <strong>{entries.length}</strong></span>
        </div>

        {entries.length ? (
          <Timetable
            data={data}
            entries={entries}
            mode={mode}
            day={day}
            base={base}
            onDay={(value) => { setDay(value); setMode("day"); }}
            onOpen={setOpenedLesson}
          />
        ) : (
          <ScheduleState
            title={data.entries.length ? "Занятия не найдены" : "В этом расписании нет занятий"}
            description={data.entries.length
              ? "Попробуйте другую группу или измените поисковый запрос."
              : "Выберите другую опубликованную неделю."}
            action={data.entries.length ? resetFilters : undefined}
            actionLabel="Сбросить фильтры"
          />
        )}

        <div className="sp-calendar__footer">
          <span><Icon name="arrow" size={14} />Нажмите на занятие, чтобы посмотреть подробности</span>
          <span>Версия {version.revision}</span>
        </div>
      </section>

      {data.note && <aside className="sp-note"><Icon name="alert" /><p>{data.note}</p></aside>}
      <LessonDialog entry={openedLesson} data={data} base={base} onClose={() => setOpenedLesson(null)} />
    </>
  );
}

export default function SchedulePage() {
  const publications = usePublications();
  const schedule = usePublishedSchedule(publications.selected, publications.refreshToken);
  const selected = publications.selected;

  function selectModule(moduleId) {
    const available = publications.versions.filter((version) => version.module_id === moduleId);
    const sameKind = available.filter((version) => version.kind === selected.kind);
    const preferred = sameKind.find((version) => version.week_start === selected.week_start)
      || chooseDefaultVersion(sameKind.length ? sameKind : available);
    if (preferred) publications.select(preferred.uuid);
  }

  function selectKind(kind) {
    const available = publications.versions.filter((version) => (
      version.module_id === selected.module_id && version.kind === kind
    ));
    const preferred = chooseDefaultVersion(available);
    if (preferred) publications.select(preferred.uuid);
  }

  return (
    <div className="schedule-page">
      <div className="sp-shell">
        <header className="sp-header">
          <Brand />
          <button
            type="button"
            className="sp-button sp-button--refresh"
            disabled={publications.status === "loading"}
            onClick={publications.refresh}
          >
            <Icon name="refresh" className={publications.status === "loading" ? "sp-spin" : ""} />
            {publications.status === "loading" ? "Обновляем" : "Обновить"}
          </button>
        </header>

        <main>
          <section className="sp-hero">
            <div>
              <div className="sp-eyebrow"><span />Учебный процесс</div>
              <h1>Расписание занятий<span>.</span></h1>
              <p>Всё по плану. Найдите свою группу и посмотрите занятия.</p>
            </div>
            {selected && (
              <div className="sp-publication">
                <span className="sp-pill"><Icon name="check" size={14} />Опубликовано</span>
                <span>{moduleLabel(selected)}</span>
                <PublicationDate value={selected.published_at} />
              </div>
            )}
          </section>

          <div className="sp-panel">
            {publications.status === "loading" && (
              <ScheduleState loading title="Загружаем публикации" description="Собираем доступные модули и недели." />
            )}
            {publications.status === "error" && (
              <ScheduleState error title="Не удалось загрузить публикации" description={publications.error} action={publications.refresh} />
            )}
            {publications.status === "ready" && !selected && (
              <ScheduleState
                title="Расписание ещё не опубликовано"
                description="После публикации учебной частью оно появится здесь."
                action={publications.refresh}
                actionLabel="Обновить список"
              />
            )}
            {selected && (
              <>
                <ScheduleFilters
                  versions={publications.versions}
                  selected={selected}
                  onModule={selectModule}
                  onKind={selectKind}
                  onWeek={publications.select}
                />
                {schedule.status === "loading" && (
                  <ScheduleState loading title="Загружаем расписание" description="Занятия выбранного периода скоро появятся здесь." />
                )}
                {schedule.status === "error" && (
                  <ScheduleState error title="Не удалось загрузить занятия" description={schedule.error} action={schedule.retry} />
                )}
                {schedule.status === "ready" && schedule.data && (
                  <ScheduleContent
                    key={selected.uuid}
                    data={schedule.data}
                    version={selected}
                    versions={publications.versions}
                    onSelect={publications.select}
                  />
                )}
              </>
            )}
          </div>
        </main>

        <footer className="sp-page-footer">
          <span>Schedule HSE</span>
          <span>Расписание обновляется после публикации учебной частью</span>
        </footer>
      </div>
    </div>
  );
}
