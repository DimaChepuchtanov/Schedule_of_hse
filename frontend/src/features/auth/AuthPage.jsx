import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  LoaderCircle,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { authApi } from "./api.js";
import AuthForm from "./components/AuthForm.jsx";
import { Navigate } from "react-router";
import Showcase from "./components/Showcase.jsx";
import "./auth.css";

export default function AuthPage({ api = authApi }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [connectionError, setConnectionError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setChecking(true);
    api
      .session({ signal: controller.signal })
      .then((session) => {
        if (active) {
          setUser(session.user);
          setConnectionError("");
        }
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
  }, [api, retryCount]);

  if (user) return <Navigate to="/menu/" replace />;

  return (
    <main className="auth-page app-shell">
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
          <div className="auth-card">
            {checking ? (
              <div className="checking-panel" role="status">
                <LoaderCircle className="spin" size={28} />
                <p>Проверяем вход…</p>
              </div>
            ) : (
              <AuthForm api={api} onAuthenticated={setUser} />
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
