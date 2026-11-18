import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { loadSchedule } from "./api.js";
import { dateLabel, initialSelection, weekLabel } from "./model.js";
import { DayAgenda, DayPicker, WeekGrid } from "./components/Timetable.jsx";
import "./schedule.css";

export default function SchedulePage() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState(null);
  const [view, setView] = useState("week");
  const [selection, setSelection] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    loadSchedule(controller.signal).then((snapshot) => {
      if (controller.signal.aborted) return;
      setData(snapshot);
      setFilters(initialSelection(snapshot));
      setSelection(null);
    }).catch((reason) => {
      if (!controller.signal.aborted) setError(reason.message || "Ошибка загрузки расписания.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [attempt]);

  const entries = useMemo(() => data && filters ? data.entries.filter((entry) =>
    entry.course === filters.course && entry.groups.includes(filters.group)) : [], [data, filters]);

  function updateFilters(next) {
    setSelection(null);
    setFilters((current) => ({ ...current, ...next }));
  }

  const course = data?.courses.find((item) => item.name === filters?.course);
  const selectedTime = selection && data.times.find((time) => time.period === selection.entry.period);
  const selectedDay = selection && data.days.find((day) => day.date === selection.entry.date);

  return <div id="hse-schedule-page" data-view={view}>
    <header className="hs-topbar">
      <div className="hs-brand"><span className="hs-brand-mark" aria-hidden="true"><CalendarDays size={18} /></span>Расписание вуза</div>
      <span className="hs-nav hs-nav-active">Расписание</span>
    </header>
    <main className="hs-content">
      {loading ? <div className="hs-status" role="status">Загружаем расписание…</div>
        : error ? <div className="hs-status" role="alert"><h1>Расписание недоступно</h1>
          <p>{error}</p><button className="hs-retry" type="button" onClick={() => setAttempt((value) => value + 1)}>Повторить загрузку</button>
        </div> : data && filters && <>
          <div className="hs-hero">
            <div><div className="hs-eyebrow">{data.week.number ? `Учебная неделя № ${data.week.number}` : "Учебная неделя"}</div>
              <h1>Расписание занятий</h1><div className="hs-period">{weekLabel(data.week)}</div>
            </div>
            {data.week.revision && <div className="hs-revision"><span className="hs-revision-dot" aria-hidden="true" />Редакция от {data.week.revision}</div>}
          </div>
          <div className="hs-controls">
            <div className="hs-field"><label htmlFor="schedule-course">Курс</label>
              <select id="schedule-course" className="hs-select" value={filters.course} onChange={(event) => {
                const next = data.courses.find((item) => item.name === event.target.value);
                updateFilters({ course: next.name, group: next.groups[0] });
              }}>{data.courses.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select>
            </div>
            <div className="hs-field hs-group-field"><label htmlFor="schedule-group">Учебная группа</label>
              <select id="schedule-group" className="hs-select" value={filters.group}
                onChange={(event) => updateFilters({ group: event.target.value })}>
                {course.groups.map((group) => <option key={group} value={group}>{group}</option>)}
              </select>
            </div>
            <div className="hs-mode" role="group" aria-label="Вид расписания">
              <button type="button" aria-pressed={view === "week"} onClick={() => setView("week")}>Неделя</button>
              <button type="button" aria-pressed={view === "day"} onClick={() => setView("day")}>День</button>
            </div>
          </div>
          <div className="hs-selection" aria-live="polite">{filters.group} · {filters.course}</div>
          {selection && <section id="schedule-lesson-details" className="hs-detail" aria-label="Подробности занятия" aria-live="polite">
            <button type="button" className="hs-close" aria-label="Закрыть подробности" onClick={() => setSelection(null)}>×</button>
            <h2 className="hs-detail-heading">{selection.part.title}</h2>
            <div className="hs-detail-sub">{selectedDay.name}, {dateLabel(selection.entry.date)} · {selection.entry.period}-я пара · {selectedTime.start}–{selectedTime.end} · {filters.group}</div>
            <div className="hs-detail-raw">{selection.entry.raw}</div>
          </section>}
          <DayPicker days={data.days} value={filters.day} onChange={(day) => updateFilters({ day })} />
          <WeekGrid data={data} entries={entries} group={filters.group} day={filters.day} selection={selection} onSelect={setSelection} />
          <DayAgenda data={data} entries={entries} day={filters.day} selection={selection} onSelect={setSelection} />
          <div className="hs-legend">
            <span className="hs-legend-item"><span className="hs-swatch" />Занятие</span>
            <span className="hs-legend-item"><span className="hs-swatch hs-swatch-online" />Онлайн</span>
            <span className="hs-legend-item"><span className="hs-swatch hs-swatch-common" />Общая запись курса</span>
          </div>
          {data.note && <div className="hs-note">{data.note}</div>}
        </>}
    </main>
  </div>;
}
