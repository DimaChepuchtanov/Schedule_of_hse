import React, { useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { ApiError, authApi } from "../api.js";
import { validateAuthForm } from "../validation.js";
import PasswordInput from "./PasswordInput.jsx";

export default function AuthForm({ onAuthenticated, api = authApi }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const errorRef = useRef(null);

  function focusError(fields) {
    const first = ["login", "password"].find((field) => fields[field]);
    requestAnimationFrame(() =>
      first
        ? document.getElementById(`auth-${first}`)?.focus()
        : errorRef.current?.focus(),
    );
  }

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const fields = validateAuthForm({ login, password });
    setErrors(fields);
    if (Object.keys(fields).length) {
      focusError(fields);
      return;
    }
    setPending(true);
    try {
      await api.login({ login: login.trim(), password });
      const session = await api.session();
      if (!session.authenticated)
        throw new ApiError(
          "Не удалось сохранить вход. Проверьте, разрешены ли cookie, и попробуйте ещё раз.",
        );
      onAuthenticated(session.user);
    } catch (failure) {
      const apiError =
        failure instanceof ApiError
          ? failure
          : new ApiError("Не удалось выполнить запрос. Попробуйте ещё раз.");
      setError(apiError.message);
      setErrors(apiError.fields);
      focusError(apiError.fields);
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="auth-heading">
      <div className="form-heading">
        <h2 id="auth-heading">С возвращением</h2>
        <p>Войдите, чтобы продолжить работу с расписанием.</p>
      </div>
      <form onSubmit={submit} noValidate aria-busy={pending}>
        <fieldset disabled={pending} className="form-fields">
          <div className="field">
            <label htmlFor="auth-login">Электронная почта</label>
            <div
              className={`input-wrap ${errors.login ? "input-invalid" : ""}`}
            >
              <Mail size={18} className="input-icon" aria-hidden="true" />
              <input
                id="auth-login"
                name="login"
                type="email"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                spellCheck="false"
                maxLength={250}
                placeholder="name@university.ru"
                aria-invalid={Boolean(errors.login)}
                aria-describedby={errors.login ? "auth-login-error" : undefined}
                required
              />
            </div>
            {errors.login && (
              <p className="field-error" id="auth-login-error">
                {errors.login}
              </p>
            )}
          </div>
          <PasswordInput
            id="auth-password"
            label="Пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
          />
        </fieldset>
        {error && (
          <div className="form-alert" role="alert" ref={errorRef} tabIndex={-1}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle size={18} className="spin" />
              Выполняем вход…
            </>
          ) : (
            <>
              Войти в систему
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
      <div className="form-divider" />
      <p className="access-note">
        <span className="small-lock">
          <LockKeyhole size={16} />
        </span>
        <span>
          Нет учётной записи?
          <br />
          Обратитесь к администратору учебной части.
        </span>
      </p>
    </section>
  );
}
