import React, { useRef, useState } from "react";
import { AlertCircle, ArrowRight, ChevronRight, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { ApiError, authApi } from "../api.js";
import { validateAuthForm } from "../validation.js";
import PasswordInput from "./PasswordInput.jsx";

export default function AuthForm({
  mode,
  initialEmail,
  onSwitch,
  onRegistered,
  onAuthenticated,
}) {
  const [login, setLogin] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const errorRef = useRef(null);
  const registration = mode === "register";

  function focusError(fields) {
    const first = ["login", "password", "confirmation"].find(
      (field) => fields[field],
    );
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
    const fields = validateAuthForm({ mode, login, password, confirmation });
    setErrors(fields);
    if (Object.keys(fields).length) {
      focusError(fields);
      return;
    }
    setPending(true);
    try {
      const credentials = { login: login.trim(), password };
      if (registration) {
        await authApi.register(credentials);
        onRegistered(credentials.login);
      } else {
        await authApi.login(credentials);
        const session = await authApi.session();
        if (!session.authenticated)
          throw new ApiError(
            "Не удалось сохранить вход. Проверьте, разрешены ли cookie, и попробуйте ещё раз.",
          );
        onAuthenticated(session.user);
      }
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

  function switchTab(nextMode) {
    if (!pending && nextMode !== mode) onSwitch(nextMode, login);
  }

  function tabKeys(event) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? "login"
        : event.key === "End"
          ? "register"
          : registration
            ? "login"
            : "register";
    switchTab(next);
    requestAnimationFrame(() =>
      document.getElementById(`tab-${next}`)?.focus(),
    );
  }

  return (
    <>

      <div id="auth-panel" role="tabpanel" aria-labelledby={`tab-${mode}`}>
        <div className="form-heading">
          <h2>{registration ? "Начнём знакомство" : "С возвращением"}</h2>
          <p>
            {registration
              ? "Создайте аккаунт для работы с расписанием."
              : "Войдите, чтобы продолжить работу с расписанием."}
          </p>
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
                  placeholder="name@university.ru"
                  aria-invalid={Boolean(errors.login)}
                  aria-describedby={
                    errors.login ? "auth-login-error" : undefined
                  }
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
              registration={registration}
            />
            {registration && (
              <PasswordInput
                id="auth-confirmation"
                label="Повторите пароль"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                error={errors.confirmation}
                registration
                confirmation
              />
            )}
          </fieldset>
          {error && (
            <div
              className="form-alert"
              role="alert"
              ref={errorRef}
              tabIndex={-1}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? (
              <>
                <LoaderCircle size={18} className="spin" />
                {registration ? "Создаём аккаунт…" : "Выполняем вход…"}
              </>
            ) : (
              <>
                {registration ? "Создать аккаунт" : "Войти в систему"}
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
          Доступ к данным определяется правами
          <br className="desktop-break" /> вашей учётной записи.
        </p>
      </div>
    </>
  );
}
