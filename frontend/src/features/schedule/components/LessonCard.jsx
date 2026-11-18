import { KIND_LABELS, lessonKind } from "../model.js";

export default function LessonCard({ entry, part, selected, onClick }) {
  const kind = lessonKind(entry, part);
  const teachers = part.teachers.join("\n");
  return (
    <button
      className={`hs-lesson ${kind === "lesson" ? "" : `hs-${kind}`}`}
      type="button"
      aria-expanded={selected}
      aria-controls="schedule-lesson-details"
      aria-label={`${part.title}, ${entry.date}, пара ${entry.period}. Открыть подробности`}
      title={[part.title, ...part.teachers].join(" · ")}
      onClick={onClick}
    >
      <span className="hs-lesson-title">{part.title}</span>
      <span className="hs-lesson-meta">
        {teachers || (kind === "common" ? "Без уточнения преподавателя и аудитории" : "Без уточнений")}
      </span>
      <span className="hs-lesson-label">{KIND_LABELS[kind]}</span>
    </button>
  );
}
