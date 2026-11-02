import { useId, useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import Modal from "./Modal.jsx";
import { generatePassword, validateUserForm } from "../model.js";

export default function UserDialog({
  type,
  user,
  busy,
  failure,
  onClose,
  onSubmit,
}) {
  const id = useId();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [login, setLogin] = useState(user?.login || "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(user?.is_active ?? true);
  const [errors, setErrors] = useState({});
  const fields = { ...(failure?.fields || {}), ...errors };
  const passwordRequired = type !== "edit";
  const title =
    type === "create"
      ? "Новый пользователь"
      : type === "edit"
        ? "Редактирование пользователя"
        : "Новый пароль";
  const description =
    type === "create"
      ? "Создайте учётную запись помощника учебной части."
      : type === "edit"
        ? "Измените имя, почту и доступ к системе."
        : `Установите новый пароль для ${user.login}.`;

  function submit(event) {
    event.preventDefault();
    if (busy) return;
    const next = validateUserForm({
      type,
      display_name: displayName,
      login,
      password,
      confirmation,
    });
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    onSubmit(
      type === "password"
        ? { password }
        : {
            display_name: displayName.trim(),
            login: login.trim().toLowerCase(),
            is_active: user?.protected ? user.is_active : active,
            ...(type === "create" ? { password } : {}),
          },
    );
  }

  function change(key, setter) {
    return (event) => {
      setter(event.target.value);
      setErrors((current) => ({ ...current, [key]: undefined }));
    };
  }

  return (
    <Modal
      title={title}
      description={description}
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate aria-busy={busy}>
        <fieldset className="um-form-fields" disabled={busy}>
          {type !== "password" && (
            <div className="um-field">
              <label htmlFor={`${id}-display_name`}>Отображаемое имя</label>
              <div
                className={`um-input-wrap ${fields.display_name ? "um-input-wrap--invalid" : ""}`}
              >
                <UserRound size={18} aria-hidden="true" />
                <input
                  id={`${id}-display_name`}
                  name="display_name"
                  value={displayName}
                  onChange={change("display_name", setDisplayName)}
                  autoComplete="off"
                  maxLength={250}
                  placeholder="Например, Анна Иванова"
                  aria-invalid={!!fields.display_name}
                  aria-describedby={
                    fields.display_name ? `${id}-display_name-error` : undefined
                  }
                />
              </div>
              {fields.display_name && (
                <p id={`${id}-display_name-error`} className="um-field-error">
                  {fields.display_name}
                </p>
              )}
            </div>
          )}
          {type !== "password" && (
            <div className="um-field">
              <label htmlFor={`${id}-login`}>Электронная почта</label>
              <div
                className={`um-input-wrap ${fields.login ? "um-input-wrap--invalid" : ""}`}
              >
                <Mail size={18} aria-hidden="true" />
                <input
                  id={`${id}-login`}
                  type="email"
                  name="login"
                  value={login}
                  onChange={change("login", setLogin)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={250}
                  placeholder="name@university.ru"
                  aria-invalid={!!fields.login}
                  aria-describedby={
                    fields.login ? `${id}-login-error` : undefined
                  }
                />
              </div>
              {fields.login && (
                <p id={`${id}-login-error`} className="um-field-error">
                  {fields.login}
                </p>
              )}
            </div>
          )}
          {type !== "password" && (
            <div className="um-role-note">
              <ShieldCheck size={19} />
              <div>
                <strong>
                  {user?.protected ? "Администратор" : "Помощник учебной части"}
                </strong>
                <span>
                  {user?.protected
                    ? "Главная учётная запись системы."
                    : "Просмотр черновиков и комментарии к занятиям."}
                </span>
              </div>
            </div>
          )}
          {passwordRequired && (
            <>
              <div className="um-field">
                <label htmlFor={`${id}-password`}>Пароль</label>
                <div
                  className={`um-input-wrap ${fields.password ? "um-input-wrap--invalid" : ""}`}
                >
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    id={`${id}-password`}
                    name="password"
                    type={visible ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={change("password", setPassword)}
                    placeholder="Не менее 8 символов"
                    maxLength={128}
                    aria-invalid={!!fields.password}
                    aria-describedby={
                      fields.password
                        ? `${id}-password-error`
                        : `${id}-password-hint`
                    }
                  />
                  <button
                    type="button"
                    className="um-password-eye"
                    onClick={() => setVisible((value) => !value)}
                    aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
                    aria-pressed={visible}
                  >
                    {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {fields.password ? (
                  <p id={`${id}-password-error`} className="um-field-error">
                    {fields.password}
                  </p>
                ) : (
                  <p id={`${id}-password-hint`} className="um-field-hint">
                    Не используйте почту, имя и простые сочетания.
                  </p>
                )}
                <button
                  type="button"
                  className="um-text-button um-generate"
                  onClick={() => {
                    try {
                      const value = generatePassword();
                      setPassword(value);
                      setConfirmation(value);
                      setVisible(true);
                      setErrors({});
                    } catch {
                      setErrors({
                        password:
                          "Не удалось сгенерировать пароль. Введите его вручную.",
                      });
                    }
                  }}
                >
                  <Sparkles size={14} />
                  Сгенерировать пароль
                </button>
              </div>
              <div className="um-field">
                <label htmlFor={`${id}-confirmation`}>Повторите пароль</label>
                <div
                  className={`um-input-wrap ${fields.confirmation ? "um-input-wrap--invalid" : ""}`}
                >
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    id={`${id}-confirmation`}
                    type={visible ? "text" : "password"}
                    name="confirmation"
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={change("confirmation", setConfirmation)}
                    placeholder="Введите пароль ещё раз"
                    maxLength={128}
                    aria-invalid={!!fields.confirmation}
                    aria-describedby={
                      fields.confirmation
                        ? `${id}-confirmation-error`
                        : undefined
                    }
                  />
                </div>
                {fields.confirmation && (
                  <p id={`${id}-confirmation-error`} className="um-field-error">
                    {fields.confirmation}
                  </p>
                )}
              </div>
            </>
          )}
          {type !== "password" && !user?.protected && (
            <label className="um-toggle-row">
              <span>
                <strong>Доступ к системе</strong>
                <small>
                  {active
                    ? "Пользователь сможет войти в аккаунт"
                    : "Вход в аккаунт будет отключён"}
                </small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              <span className="um-switch" aria-hidden="true" />
            </label>
          )}
        </fieldset>
        {failure && (
          <div className="um-alert" role="alert">
            <AlertCircle size={18} />
            <span>{failure.message}</span>
          </div>
        )}
        {type === "password" && (
          <p className="um-field-hint um-password-note">
            Предыдущий пароль перестанет действовать. Передайте новый пароль
            пользователю лично.
          </p>
        )}
        <footer className="um-modal__footer">
          <button
            type="button"
            className="um-button um-button--secondary"
            onClick={onClose}
            disabled={busy}
          >
            Отмена
          </button>
          <button type="submit" className="um-button" disabled={busy}>
            {busy && <LoaderCircle size={16} className="um-spin" />}
            {busy
              ? "Сохраняем…"
              : type === "create"
                ? "Создать пользователя"
                : "Сохранить изменения"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
