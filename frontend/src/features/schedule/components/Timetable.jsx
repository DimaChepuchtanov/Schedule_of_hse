import { useMemo } from "react";
import { formatDate, isDate, todayISO } from "../model.js";
import Icon from "./Icon.jsx";
import LessonCard from "./LessonCard.jsx";
import ScheduleState from "./ScheduleState.jsx";

function TimeLabel({ time }) {
  return (
    <span className="sp-time">
      <strong>{String(time.period).padStart(2, "0")}<small>пара</small></strong>
      {time.start && <span>{time.start}</span>}
      {time.end && <span className="sp-time__end">{time.end}</span>}
    </span>
  );
}

export default function Timetable({ data, entries, mode, day, base = false, onDay, onOpen }) {
  const today = todayISO();
  const bySlot = useMemo(() => {
    const result = new Map();
    for (const entry of entries) {
      const key = entry.date + "|" + entry.period;
      if (!result.has(key)) result.set(key, []);
      result.get(key).push(entry);
    }
    return result;
  }, [entries]);

  if (mode === "day") {
    const selectedDay = data.days.find((item) => item.date === day);
    const visibleTimes = data.times.filter((time) => bySlot.has(day + "|" + time.period));
    return (
      <section aria-label="Расписание на день" className="sp-day-view">
        <div className="sp-day-view__heading">
          <Icon name="calendar" />
          <h3>{selectedDay?.name || "Учебный день"}</h3>
          {!base && isDate(day) && <span>{formatDate(day)}</span>}
        </div>
        {visibleTimes.length ? visibleTimes.map((time) => (
          <div className="sp-day-slot" key={time.period}>
            <TimeLabel time={time} />
            <div className="sp-day-slot__lessons">
              {bySlot.get(day + "|" + time.period).map((entry) => (
                <LessonCard key={entry.id} entry={entry} onOpen={onOpen} />
              ))}
            </div>
          </div>
        )) : <ScheduleState title="В этот день занятий нет" description="Можно выбрать другой день или изменить фильтры." />}
      </section>
    );
  }

  return (
    <div className="sp-table-scroll" role="region" aria-label="Таблица расписания на неделю" tabIndex={0}>
      <table className="sp-table">
        <caption className="sp-sr-only">Расписание занятий по дням и номерам пар</caption>
        <thead>
          <tr>
            <th scope="col" className="sp-table__time-head"><Icon name="clock" size={16} /><span>Пара</span></th>
            {data.days.map((item) => (
              <th scope="col" key={item.date} className={!base && item.date === today ? "sp-table__today" : ""}>
                <button className="sp-day-heading" onClick={() => onDay(item.date)} type="button">
                  <span>{item.name}</span>
                  {!base && isDate(item.date) && <strong>{formatDate(item.date, { month: "short" })}</strong>}
                  {!base && item.date === today && <small>Сегодня</small>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.times.map((time) => (
            <tr key={time.period}>
              <th scope="row"><TimeLabel time={time} /></th>
              {data.days.map((item) => {
                const lessons = bySlot.get(item.date + "|" + time.period) || [];
                return (
                  <td key={item.date} className={!base && item.date === today ? "sp-table__today" : ""}>
                    <div className="sp-cell">
                      {lessons.length ? lessons.map((entry) => (
                        <LessonCard key={entry.id} entry={entry} onOpen={onOpen} />
                      )) : <span className="sp-cell__empty" aria-label="Нет занятий">·</span>}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
