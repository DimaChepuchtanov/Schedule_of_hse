import { useEffect, useRef } from "react";
import { formatDate, isDate, lessonParts } from "../model.js";
import Icon from "./Icon.jsx";

export default function LessonDialog({ entry, data, base = false, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (entry && !dialog.open) dialog.showModal();
    if (!entry && dialog.open) dialog.close();
  }, [entry]);

  const parts = entry ? lessonParts(entry) : null;
  const day = data?.days.find((item) => item.date === entry?.date);
  const time = data?.times.find((item) => item.period === entry?.period);

  return (
    <dialog
      className="sp-dialog"
      ref={ref}
      aria-labelledby="sp-lesson-title"
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {entry && (
        <div className="sp-dialog__body">
          <div className="sp-dialog__top">
            <span className="sp-pill"><Icon name="book" size={14} />{parts.label}</span>
            <button className="sp-icon-button" type="button" onClick={onClose} aria-label="Закрыть описание занятия">
              <Icon name="close" />
            </button>
          </div>
          <h2 id="sp-lesson-title">{parts.title}</h2>
          <div className="sp-dialog__meta">
            <span><Icon name="calendar" />{day?.name}{!base && isDate(entry.date) && ", " + formatDate(entry.date)}</span>
            <span><Icon name="clock" />{entry.period} пара{time?.start && " · " + time.start}{time?.end && "–" + time.end}</span>
          </div>
          <div className="sp-dialog__section">
            <h3>Полное описание</h3>
            <p className="sp-dialog__raw">{entry.raw}</p>
          </div>
          <div className="sp-dialog__section">
            <h3>Группы · {entry.course}</h3>
            <div className="sp-group-tags">
              {entry.groups.length
                ? entry.groups.map((group) => <span key={group}>{group}</span>)
                : <span>Группы не указаны</span>}
            </div>
          </div>
          <button type="button" className="sp-button sp-button--primary sp-dialog__done" onClick={onClose}>
            Понятно
          </button>
        </div>
      )}
    </dialog>
  );
}
