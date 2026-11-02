import React from "react";
import { CalendarDays, Check } from "lucide-react";

export default function ScheduleIllustration() {
  const lessons = [
    {
      day: 0,
      row: 0,
      title: "Математика",
      detail: "ИС-21 · ауд. 204",
      tone: "mint",
    },
    {
      day: 1,
      row: 1,
      title: "Информатика",
      detail: "ИС-22 · ауд. 308",
      tone: "sand",
    },
    {
      day: 2,
      row: 0,
      title: "Физика",
      detail: "ИС-21 · ауд. 112",
      tone: "lilac",
    },
    {
      day: 3,
      row: 2,
      title: "Практика",
      detail: "ИС-22 · ауд. 308",
      tone: "mint",
    },
    {
      day: 4,
      row: 1,
      title: "Математика",
      detail: "ИС-21 · ауд. 204",
      tone: "sand",
    },
  ];
  return (
    <div className="schedule-art" aria-hidden="true">
      <div className="art-label">
        <span className="tiny-line" /> Всё связано. Всё учтено.
      </div>
      <div className="schedule-sheet">
        <div className="sheet-header">
          <div>
            <span className="sheet-eyebrow">Пример расписания</span>
            <strong>Учебная неделя</strong>
          </div>
          <span className="sheet-button">
            <CalendarDays size={15} />
          </span>
        </div>
        <div className="week-head">
          <span />
          {["ПН", "ВТ", "СР", "ЧТ", "ПТ"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="week-body">
          <div className="week-times">
            {["08:30", "10:10", "11:50", "13:30"].map((time) => (
              <span key={time}>{time}</span>
            ))}
          </div>
          <div className="week-grid">
            {Array.from({ length: 20 }, (_, i) => (
              <span
                className="week-cell"
                style={{
                  gridColumn: (i % 5) + 1,
                  gridRow: Math.floor(i / 5) + 1,
                }}
                key={i}
              />
            ))}
            {lessons.map((lesson) => (
              <div
                key={`${lesson.day}-${lesson.row}`}
                className={`lesson lesson-${lesson.tone}`}
                style={{ gridColumn: lesson.day + 1, gridRow: lesson.row + 1 }}
              >
                <strong>{lesson.title}</strong>
                <span>{lesson.detail}</span>
                <i />
              </div>
            ))}
          </div>
        </div>
        <div className="sheet-footer">
          <span>
            <span className="status-dot" /> Изменения согласованы
          </span>
          <span>5 дней</span>
        </div>
      </div>
      <div className="floating-note">
        <span className="note-icon">
          <Check size={17} />
        </span>
        <div>
          <strong>Без пересечений</strong>
          <span>Аудитории и преподаватели учтены</span>
        </div>
      </div>
    </div>
  );
}
