import React, { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

export default function PasswordInput({ id, label, value, onChange, error }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`input-wrap ${error ? "input-invalid" : ""}`}>
        <LockKeyhole size={18} className="input-icon" aria-hidden="true" />
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete="current-password"
          placeholder="Введите пароль"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          required
        />
        <button
          className="password-toggle"
          type="button"
          aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
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
