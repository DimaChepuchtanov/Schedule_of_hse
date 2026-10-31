import React, { useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, LogOut } from "lucide-react";
import { authApi } from "../api.js";

export default function SessionPanel({ user, onLoggedOut }) {
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
