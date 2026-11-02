import { useEffect, useRef } from "react";
import {
  Ellipsis,
  KeyRound,
  LockKeyhole,
  Pencil,
  Power,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { createdOn, initials, lastSeen } from "../model.js";

function RowMenu({ user, onAction, disabled }) {
  const ref = useRef(null);
  useEffect(() => {
    function close(event) {
      if (!ref.current?.contains(event.target))
        ref.current?.removeAttribute("open");
    }
    function escape(event) {
      if (event.key === "Escape" && ref.current?.open) {
        ref.current.removeAttribute("open");
        ref.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <details
      ref={ref}
      className="um-row-menu"
      onToggle={(event) => {
        if (event.currentTarget.open)
          document.querySelectorAll(".um-row-menu[open]").forEach((node) => {
            if (node !== event.currentTarget) node.removeAttribute("open");
          });
      }}
    >
      <summary
        className="um-icon-button"
        aria-label={`Другие действия: ${user.login}`}
      >
        <Ellipsis size={19} />
      </summary>
      <div className="um-row-menu__panel">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            ref.current.removeAttribute("open");
            onAction(user.is_active ? "deactivate" : "activate", user);
          }}
        >
          <Power size={15} />
          {user.is_active ? "Отключить доступ" : "Включить доступ"}
        </button>
        <button
          type="button"
          disabled={disabled}
          className="um-danger-text"
          onClick={() => {
            ref.current.removeAttribute("open");
            onAction("delete", user);
          }}
        >
          <Trash2 size={15} />
          Удалить пользователя
        </button>
      </div>
    </details>
  );
}

export default function UsersTable({ users, busy, onAction }) {
  return (
    <div className="um-table-wrap" aria-busy={busy}>
      <table className="um-table">
        <caption className="um-sr-only">
          Учётные записи пользователей системы расписания
        </caption>
        <thead>
          <tr>
            <th scope="col">Пользователь</th>
            <th scope="col">Роль</th>
            <th scope="col">Статус</th>
            <th scope="col" className="um-created-at">
              Создан
            </th>
            <th scope="col" className="um-last-login">
              Последний вход
            </th>
            <th scope="col" className="um-actions-title">
              Действия
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.id}>
              <td className="um-person-cell">
                <div className="um-person">
                  <span
                    className={`um-avatar um-avatar--${user.protected ? "admin" : index % 3}`}
                  >
                    {initials(user.login, user.display_name)}
                  </span>
                  <div>
                    <span className="um-person-name">
                      {user.display_name || user.login}
                      {user.is_current_user && (
                        <small className="um-you">Вы</small>
                      )}
                    </span>
                    <span className="um-person-address">{user.login}</span>
                  </div>
                </div>
              </td>
              <td data-label="Роль">
                <span
                  className={`um-role-badge ${user.protected ? "um-role-badge--admin" : ""}`}
                >
                  {user.protected && <ShieldCheck size={13} />}
                  {user.role_label}
                </span>
              </td>
              <td data-label="Статус">
                <span
                  className={`um-status ${user.is_active ? "um-status--active" : "um-status--disabled"}`}
                >
                  <i />
                  {user.is_active ? "Активен" : "Отключён"}
                </span>
              </td>
              <td data-label="Создан" className="um-created-at">
                {createdOn(user.created_at)}
              </td>
              <td data-label="Последний вход" className="um-last-login">
                {lastSeen(user.last_login)}
              </td>
              <td className="um-actions-cell">
                <div className="um-actions">
                  <button
                    type="button"
                    className="um-icon-button"
                    disabled={busy}
                    onClick={() => onAction("edit", user)}
                    aria-label={`Редактировать ${user.login}`}
                    title="Редактировать"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="um-icon-button"
                    disabled={busy}
                    onClick={() => onAction("password", user)}
                    aria-label={`Сменить пароль ${user.login}`}
                    title="Сменить пароль"
                  >
                    <KeyRound size={17} />
                  </button>
                  {user.protected ? (
                    <span
                      className="um-protected"
                      title="Главная учётная запись защищена"
                      aria-label="Главная учётная запись защищена"
                    >
                      <LockKeyhole size={15} />
                    </span>
                  ) : (
                    <RowMenu user={user} disabled={busy} onAction={onAction} />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
