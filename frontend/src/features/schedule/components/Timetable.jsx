import LessonCard from "./LessonCard.jsx";
import { dateLabel, lessonParts, shortDay } from "../model.js";

function Cards({ entries, selection, onSelect }) {
  return entries.flatMap((entry) => lessonParts(entry).map((part, index) => {
    const key = `${entry.id}:${index}`;
    return <LessonCard key={key} entry={entry} part={part}
      selected={selection?.key === key} onClick={() => onSelect({ key, entry, part })} />;
  }));
}

export function WeekGrid({ data, entries, group, day, selection, onSelect }) {
  const maxPeriod = Math.max(4, ...entries.map((entry) => entry.period));
  return (
    <div className="hs-table-wrap">
      <table className="hs-table" aria-label={`Расписание ${group}`}>
        <thead><tr>
          <th className="hs-time-head" scope="col">Пара</th>
          {data.days.map((item) => (
            <th key={item.date} scope="col" className={item.date === day ? "hs-day-selected" : ""}>
              <div className="hs-weekday">{shortDay(item.date)}</div>
              <div className="hs-day-number">{item.date.slice(8, 10)}</div>
            </th>
          ))}
        </tr></thead>
        <tbody>{data.times.filter((time) => time.period <= maxPeriod).map((time) => (
          <tr key={time.period}>
            <th scope="row"><div className="hs-slot-number">{time.period}</div>
              <div className="hs-slot-time">{time.start}</div>
              <div className="hs-slot-time">{time.end}</div>
            </th>
            {data.days.map((item) => {
              const lessons = entries.filter((entry) => entry.date === item.date && entry.period === time.period);
              return <td key={item.date} className={item.date === day ? "hs-day-selected" : ""}>
                {lessons.length
                  ? <Cards entries={lessons} selection={selection} onSelect={onSelect} />
                  : <span className="hs-empty" aria-label="Занятий нет">·</span>}
              </td>;
            })}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function DayPicker({ days, value, onChange }) {
  return <div className="hs-daybar" role="group" aria-label="День недели">
    {days.map((day) => <button key={day.date} type="button" aria-pressed={value === day.date}
      aria-label={`${day.name}, ${dateLabel(day.date)}`} onClick={() => onChange(day.date)}>
      <span>{shortDay(day.date)}</span><strong>{day.date.slice(8, 10)}</strong>
    </button>)}
  </div>;
}

export function DayAgenda({ data, entries, day, selection, onSelect }) {
  const lessons = entries.filter((entry) => entry.date === day).sort((a, b) => a.period - b.period);
  const periods = [...new Set(lessons.map((entry) => entry.period))];
  return <div className="hs-agenda" aria-label={`Занятия на ${dateLabel(day)}`}>
    {!lessons.length && <div className="hs-agenda-empty">Занятий в этот день в файле нет.</div>}
    {periods.map((period) => {
      const time = data.times.find((item) => item.period === period);
      return <div key={period} className="hs-agenda-row">
        <div className="hs-agenda-clock"><strong>{period}-я пара</strong>
          <div>{time.start}</div><div>{time.end}</div>
        </div>
        <div><Cards entries={lessons.filter((entry) => entry.period === period)}
          selection={selection} onSelect={onSelect} /></div>
      </div>;
    })}
  </div>;
}
