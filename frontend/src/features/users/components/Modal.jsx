import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({
  title,
  description,
  busy,
  onClose,
  children,
  compact = false,
}) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const node = ref.current;
    const previous = document.activeElement;
    node.showModal();
    (node.querySelector("input") || node.querySelector("button"))?.focus();
    return () => {
      node.close();
      previous?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`um-modal ${compact ? "um-modal--compact" : ""}`}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !busy) onClose();
      }}
    >
      <div
        className="um-modal__inner"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="um-icon-button um-modal__close"
          onClick={onClose}
          disabled={busy}
          aria-label="Закрыть окно"
        >
          <X size={20} />
        </button>
        <header className="um-modal__heading">
          <h2 id={`${id}-title`}>{title}</h2>
          <p id={`${id}-description`}>{description}</p>
        </header>
        {children}
      </div>
    </dialog>
  );
}
