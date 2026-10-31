import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  RotateCw,
  Sparkles,
  Users,
} from "lucide-react";
import { ApiError, authApi } from "./api.js";
import { validateAuthForm } from "./validation.js";

function Brand({ light = false }) {
  return (
    <div className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-mark">
        <CalendarDays size={23} strokeWidth={1.8} />
      </span>
      <span>
        Расписание<span className="brand-dot">.</span>
      </span>
    </div>
  );
}

function ScheduleIllustration() {
  const lessons = [
    {
      day: 0,
      row: 0,
      title: "Математика",
      detail: "ИС-21 · ауд. 204",
      tone: "mint",
    },
    {
      day: 1,
      row: 1,
      title: "Информатика",
      detail: "ИС-22 · ауд. 308",
      tone: "sand",
    },
    {
      day: 2,
      row: 0,
      title: "Физика",
      detail: "ИС-21 · ауд. 112",
      tone: "lilac",
    },
    {
      day: 3,
      row: 2,
      title: "Практика",
      detail: "ИС-22 · ауд. 308",
      tone: "mint",
    },
    {
      day: 4,
      row: 1,
      title: "Математика",
      detail: "ИС-21 · ауд. 204",
      tone: "sand",
    },
  ];
  return (
    <div className="schedule-art" aria-hidden="true">
      <div className="art-label">
        <span className="tiny-line" /> Всё связано. Всё учтено.
      </div>
      <div className="schedule-sheet">
        <div className="sheet-header">
          <div>
            <span className="sheet-eyebrow">Пример расписания</span>
            <strong>Учебная неделя</strong>
          </div>
          <span className="sheet-button">
            <CalendarDays size={15} />
          </span>
        </div>
        <div className="week-head">
          <span />
          {["ПН", "ВТ", "СР", "ЧТ", "ПТ"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="week-body">
          <div className="week-times">
            {["08:30", "10:10", "11:50", "13:30"].map((time) => (
              <span key={time}>{time}</span>
            ))}
          </div>
          <div className="week-grid">
            {Array.from({ length: 20 }, (_, i) => (
              <span
                className="week-cell"
                style={{
                  gridColumn: (i % 5) + 1,
                  gridRow: Math.floor(i / 5) + 1,
                }}
                key={i}
              />
            ))}
            {lessons.map((lesson) => (
              <div
                key={`${lesson.day}-${lesson.row}`}
                className={`lesson lesson-${lesson.tone}`}
                style={{ gridColumn: lesson.day + 1, gridRow: lesson.row + 1 }}
              >
                <strong>{lesson.title}</strong>
                <span>{lesson.detail}</span>
                <i />
              </div>
            ))}
          </div>
        </div>
        <div className="sheet-footer">
          <span>
            <span className="status-dot" /> Изменения согласованы
          </span>
          <span>5 дней</span>
        </div>
      </div>
      <div className="floating-note">
        <span className="note-icon">
          <Check size={17} />
        </span>
        <div>
          <strong>Без пересечений</strong>
          <span>Аудитории и преподаватели учтены</span>
        </div>
      </div>
    </div>
  );
}

function Showcase() {
  return (
    <aside className="showcase">
      <div className="showcase-noise" aria-hidden="true" />
      <Brand light />
      <div className="showcase-content">
        <div className="eyebrow">
          <span /> Планирование учебных занятий
        </div>
        <h1>
          Больше порядка.
          <br />
          <em>Меньше переносов.</em>
        </h1>
        <p className="showcase-description">
          Единое пространство для составления
          <br className="desktop-break" /> и корректировки учебного расписания.
        </p>
        <ScheduleIllustration />
        <div className="feature-row">
          <span>
            <Users size={16} /> Группы
          </span>
          <span>
            <BookOpen size={16} /> Преподаватели
          </span>
          <span>
            <CalendarDays size={16} /> Аудитории
          </span>
        </div>
      </div>
      <div className="showcase-footer">
        <span>Время для главного — для обучения.</span>
        <span className="footer-plus">✳</span>
      </div>
    </aside>
  );
}

function PasswordInput({
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

function AuthForm({
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
      <div
        className="auth-tabs"
        role="tablist"
        aria-label="Вход или регистрация"
        onKeyDown={tabKeys}
      >
        <button
          id="tab-login"
          role="tab"
          aria-selected={!registration}
          aria-controls="auth-panel"
          tabIndex={registration ? -1 : 0}
          disabled={pending}
          type="button"
          onClick={() => switchTab("login")}
        >
          Вход
        </button>
        <button
          id="tab-register"
          role="tab"
          aria-selected={registration}
          aria-controls="auth-panel"
          tabIndex={registration ? 0 : -1}
          disabled={pending}
          type="button"
          onClick={() => switchTab("register")}
        >
          Регистрация
        </button>
      </div>
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
          <p className="form-bottom">
            {registration ? "Уже есть аккаунт?" : "Ещё нет аккаунта?"}{" "}
            <button
              type="button"
              disabled={pending}
              onClick={() => switchTab(registration ? "login" : "register")}
            >
              {registration ? "Войти" : "Зарегистрироваться"}
              <ChevronRight size={14} />
            </button>
          </p>
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

function SessionPanel({ user, onLoggedOut }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setPending(true);
    setError("");
    try {
      await authApi.logout();
      onLoggedOut();
    } catch (failure) {
      // If the session has already expired, reflect the server state.
      try {
        const session = await authApi.session();
        if (!session.authenticated) {
          onLoggedOut();
          return;
        }
      } catch {
        /* Keep the account visible until logout is confirmed. */
      }
      setError(failure.message || "Не удалось выйти. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="session-panel">
      <div className="session-symbol">
        <CheckCircle2 size={35} strokeWidth={1.6} />
      </div>
      <span className="session-badge">
        <span className="status-dot" /> Вход выполнен
      </span>
      <h2>
        Вы в своём
        <br />
        рабочем пространстве.
      </h2>
      <p className="session-description">
        Учётная запись подтверждена.
        <br />
        Ваш вход сохранён в этом браузере.
      </p>
      <div className="user-card">
        <span className="user-avatar">
          {user.login.slice(0, 1).toLocaleUpperCase("ru")}
        </span>
        <div>
          <span>Вы вошли как</span>
          <strong>{user.login}</strong>
        </div>
        <CheckCircle2 size={18} className="user-check" />
      </div>
      {error && (
        <div role="alert" className="form-alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      <button
        className="secondary-button"
        type="button"
        disabled={pending}
        onClick={logout}
      >
        {pending ? (
          <LoaderCircle size={17} className="spin" />
        ) : (
          <LogOut size={17} />
        )}
        {pending ? "Выходим…" : "Выйти из аккаунта"}
      </button>
      <p className="session-footnote">
        Завершайте работу выходом из аккаунта,
        <br />
        если используете общий компьютер.
      </p>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("login");
  const [initialEmail, setInitialEmail] = useState("");
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [connectionError, setConnectionError] = useState("");
  const [notice, setNotice] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setChecking(true);
    authApi
      .session({ signal: controller.signal })
      .then((session) => {
        if (!active) return;
        setUser(session.user);
        setConnectionError("");
      })
      .catch((error) => {
        if (active)
          setConnectionError(error.message || "Сервер временно недоступен.");
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [retryCount]);

  function switchMode(nextMode, email) {
    setInitialEmail(email);
    setMode(nextMode);
    setNotice("");
  }

  return (
    <main className="app-shell">
      <Showcase />
      <section className="auth-side" aria-label="Доступ к системе">
        <div className="auth-topline">
          <span className="topline-icon">
            <Sparkles size={15} />
          </span>
          Рабочее пространство
        </div>
        <div className="auth-container">
          {!checking && connectionError && (
            <div className="connection-alert" role="status">
              <AlertCircle size={17} />
              <div>
                <strong>Сервер временно недоступен</strong>
                <span>Вы можете повторить подключение.</span>
              </div>
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                aria-label="Повторить подключение"
              >
                <RotateCw size={17} />
              </button>
            </div>
          )}
          {notice && (
            <div className="success-alert" role="status">
              <CheckCircle2 size={18} />
              <span>{notice}</span>
            </div>
          )}
          <div className={`auth-card ${user ? "auth-card-session" : ""}`}>
            {checking ? (
              <div className="checking-panel" role="status">
                <LoaderCircle className="spin" size={28} />
                <p>Проверяем вход…</p>
              </div>
            ) : user ? (
              <SessionPanel
                user={user}
                onLoggedOut={() => {
                  setUser(null);
                  setNotice("Вы вышли из аккаунта.");
                  setMode("login");
                }}
              />
            ) : (
              <AuthForm
                key={mode}
                mode={mode}
                initialEmail={initialEmail}
                onSwitch={switchMode}
                onRegistered={(email) => {
                  setInitialEmail(email);
                  setMode("login");
                  setNotice(
                    "Аккаунт создан. Войдите с вашей почтой и паролем.",
                  );
                  setConnectionError("");
                }}
                onAuthenticated={(account) => {
                  setUser(account);
                  setConnectionError("");
                  setNotice("");
                }}
              />
            )}
          </div>
          <p className="auth-caption">
            Система составления и корректировки
            <br />
            учебного расписания
          </p>
        </div>
        <div className="auth-footer">
          <span>Планирование начинается с порядка.</span>
          <span className="footer-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      </section>
    </main>
  );
}
