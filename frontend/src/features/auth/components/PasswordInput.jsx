import React, { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  error,
  registration,
  confirmation = false,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`input-wrap ${error ? "input-invalid" : ""}`}>
        <LockKeyhole size={18} className="input-icon" aria-hidden="true" />
        <input
          id={id}
          name={confirmation ? "confirmation" : "password"}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={registration ? "new-password" : "current-password"}
          placeholder={
            registration && !confirmation
              ? "Не менее 8 символов"
              : confirmation
                ? "Повторите пароль"
                : "Введите пароль"
          }
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          required
        />
        <button
          className="password-toggle"
          type="button"
          aria-label={`${visible ? "Скрыть" : "Показать"} ${confirmation ? "повтор пароля" : "пароль"}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
