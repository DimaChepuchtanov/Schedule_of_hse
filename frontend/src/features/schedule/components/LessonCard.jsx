import { lessonParts } from "../model.js";
import Icon from "./Icon.jsx";

export default function LessonCard({ entry, onOpen }) {
  const { title, description, kind, label } = lessonParts(entry);
  return (
    <button
      className={"sp-lesson sp-lesson--" + kind}
      onClick={() => onOpen(entry)}
      type="button"
      aria-label={"Подробнее: " + title + ", " + entry.groups.join(", ")}
    >
      <span className="sp-lesson__top">
        <span className="sp-lesson__type">{label}</span>
        <Icon name="arrow" size={13} />
      </span>
      <strong className="sp-lesson__title">{title}</strong>
      {description && <span className="sp-lesson__description">{description}</span>}
      <span className="sp-lesson__groups">
        <Icon name="users" size={13} />
        <span>{entry.groups.length ? entry.groups.join(", ") : entry.course}</span>
      </span>
    </button>
  );
}
