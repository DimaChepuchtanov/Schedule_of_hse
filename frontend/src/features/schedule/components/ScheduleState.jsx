import Icon from "./Icon.jsx";

export default function ScheduleState({
  loading = false,
  error = false,
  title,
  description,
  action,
  actionLabel = "Повторить",
}) {
  return (
    <div
      className={"sp-state" + (error ? " sp-state--error" : "")}
      role={error ? "alert" : "status"}
      aria-live="polite"
    >
      <span className="sp-state__icon" aria-hidden="true">
        {loading ? <span className="sp-spinner" /> : <Icon name={error ? "alert" : "calendar"} size={28} />}
      </span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && (
        <button className="sp-button sp-button--primary" onClick={action} type="button">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
