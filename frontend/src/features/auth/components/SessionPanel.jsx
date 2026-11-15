import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileUp,
  LoaderCircle,
  LogOut,
  Users,
} from "lucide-react";
import { authApi } from "../api.js";

export default function SessionPanel({
  user,
  onLoggedOut,
  api = authApi,
  managementHref = "/staff/users/",
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setPending(true);
    setError("");
    try {
      await api.logout();
      onLoggedOut();
    } catch (failure) {
      // If the session has already expired, reflect the server state.
      try {
        const session = await api.session();
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
          {(user.display_name || user.login)
            .slice(0, 1)
            .toLocaleUpperCase("ru")}
        </span>
        <div>
          <span>Вы вошли как</span>
          <strong>{user.display_name || user.login}</strong>
          <small className="session-user-email">{user.login}</small>
        </div>
        <CheckCircle2 size={18} className="user-check" />
      </div>
      {error && (
        <div role="alert" className="form-alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {user.is_superuser && (
        <>
          <a className="primary-button session-admin-link" href={managementHref}>
            <Users size={17} />
            Управление пользователями
            <ArrowRight size={17} />
          </a>
          <a className="primary-button session-admin-link" href="/data-import/">
            <FileUp size={17} />
            Импорт данных
            <ArrowRight size={17} />
          </a>
        </>
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
