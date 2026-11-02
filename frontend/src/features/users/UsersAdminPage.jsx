import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Plus,
  RotateCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserRoundX,
  Users,
  X,
} from "lucide-react";
import { UsersApiError, usersApi } from "./api.js";
import { initials } from "./model.js";
import Modal from "./components/Modal.jsx";
import UserDialog from "./components/UserDialog.jsx";
import UsersTable from "./components/UsersTable.jsx";
import "./users.css";

const empty = {
  results: [],
  count: 0,
  page: 1,
  page_size: 6,
  pages: 1,
  summary: { total: 0, active: 0, inactive: 0 },
};

export default function UsersAdminPage({
  api = usersApi,
  authHref = "/auth/",
  scheduleHref = "/",
  onLoggedOut,
}) {
  const [context, setContext] = useState(null);
  const [gateError, setGateError] = useState(null);
  const [data, setData] = useState(empty);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [gateRefresh, setGateRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [failure, setFailure] = useState(null);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState("");
  const lock = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setGateError(null);
    api
      .context({ signal: controller.signal })
      .then((value) => {
        if (alive) setContext(value);
      })
      .catch((error) => {
        if (alive) setGateError(error);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [api, gateRefresh]);

  useEffect(() => {
    if (!context) return;
    let alive = true;
    const controller = new AbortController();
    setLoading(true);
    setListError(null);
    api
      .list(
        { query: debounced, status, role, page, pageSize: 6 },
        { signal: controller.signal },
      )
      .then((value) => {
        if (alive) setData(value);
      })
      .catch((error) => {
        if (!alive) return;
        if ([401, 403].includes(error.status)) {
          setContext(null);
          setData(empty);
          setDialog(null);
          setGateError(error);
        } else setListError(error);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [api, context, debounced, status, role, page, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(timer);
  }, [toast]);

  function open(type, user) {
    if (!lock.current) {
      setFailure(null);
      setDialog({ type, user });
    }
  }
  function close() {
    if (!lock.current) {
      setDialog(null);
      setFailure(null);
    }
  }

  async function save(values = {}) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setFailure(null);
    try {
      const { type, user } = dialog;
      let result;
      if (type === "create") result = await api.create(values);
      else if (type === "edit") result = await api.update(user.id, values);
      else if (type === "password")
        result = await api.password(user.id, values.password);
      else if (type === "delete") await api.remove(user.id);
      else
        result = await api.update(user.id, { is_active: type === "activate" });
      if (result?.id === context.user.id)
        setContext((current) => ({ ...current, user: result }));
      setDialog(null);
      setPage(1);
      setRefresh((value) => value + 1);
      setToast({
        text: {
          create: "Пользователь создан",
          edit: "Изменения сохранены",
          password: "Пароль изменён",
          delete: "Пользователь удалён",
          activate: "Доступ включён",
          deactivate: "Доступ отключён",
        }[type],
        error: false,
      });
    } catch (error) {
      if ([401, 403].includes(error.status)) {
        setContext(null);
        setData(empty);
        setDialog(null);
        setGateError(error);
      } else
        setFailure(
          error instanceof UsersApiError
            ? error
            : new UsersApiError(
                "Не удалось сохранить изменения. Попробуйте ещё раз.",
              ),
        );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  async function logout() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    try {
      await api.logout();
      if (onLoggedOut) onLoggedOut();
      else window.location.assign(authHref);
    } catch (error) {
      setToast({
        text:
          error instanceof UsersApiError
            ? error.message
            : "Не удалось выйти из аккаунта.",
        error: true,
      });
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  if (!context)
    return (
      <main className="um-screen">
        <section className="um-gate">
          <span className="um-gate__icon">
            {gateError ? (
              <LockKeyhole size={28} />
            ) : (
              <LoaderCircle size={28} className="um-spin" />
            )}
          </span>
          <h1>{gateError ? "Доступ к управлению" : "Проверяем доступ"}</h1>
          <p role={gateError ? "alert" : "status"}>
            {gateError?.message || "Подключаем ваше рабочее пространство…"}
          </p>
          {gateError && (
            <div className="um-gate__actions">
              <a href={authHref} className="um-button">
                Перейти ко входу
                <ArrowRight size={16} />
              </a>
              <button
                className="um-button um-button--secondary"
                type="button"
                onClick={() => setGateRefresh((value) => value + 1)}
              >
                Повторить
              </button>
            </div>
          )}
        </section>
      </main>
    );

  const summary = data.summary;
  const confirmation =
    dialog && !["create", "edit", "password"].includes(dialog.type);
  return (
    <main className="um-screen">
      <div className="um-workspace">
        <header className="um-header">
          <a
            href={scheduleHref}
            className="um-brand"
            aria-label="Расписание — главная"
          >
            <span className="um-brand__mark">
              <CalendarDays size={23} strokeWidth={1.8} />
            </span>
            <span>
              Расписание<span className="um-brand__dot">.</span>
            </span>
          </a>
          <div className="um-account">
            <span className="um-avatar um-avatar--admin">
              {initials(context.user.login, context.user.display_name)}
            </span>
            <div>
              <strong>{context.user.display_name || context.user.login}</strong>
              <span>Администратор</span>
            </div>
            <button
              type="button"
              className="um-icon-button um-logout"
              onClick={logout}
              disabled={pending}
              aria-label="Выйти из аккаунта"
              title="Выйти"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <section className="um-card" aria-labelledby="um-title">
          <div className="um-card__top">
            <nav aria-label="Хлебные крошки" className="um-breadcrumb">
              <a href={scheduleHref}>Рабочее пространство</a>
              <ChevronRight size={13} />
              <span>Пользователи</span>
            </nav>
            <span className="um-access-label">
              <ShieldCheck size={14} />
              Управление доступом
            </span>
          </div>
          <div className="um-heading">
            <div>
              <h1 id="um-title">Пользователи</h1>
              <p>Учётные записи и доступ к системе расписания.</p>
            </div>
            <button
              type="button"
              className="um-button"
              onClick={() => open("create")}
              disabled={pending}
            >
              <Plus size={18} />
              Добавить пользователя
            </button>
          </div>
          <div className="um-stats" aria-label="Сводка по пользователям">
            {[
              {
                label: "Всего пользователей",
                value: summary.total,
                Icon: Users,
                css: "total",
              },
              {
                label: "Активные",
                value: summary.active,
                Icon: UserCheck,
                css: "active",
              },
              {
                label: "Доступ отключён",
                value: summary.inactive,
                Icon: UserRoundX,
                css: "inactive",
              },
            ].map(({ label, value, Icon, css }) => (
              <div className={`um-stat um-stat--${css}`} key={css}>
                <span className="um-stat__icon">
                  <Icon size={21} strokeWidth={1.65} />
                </span>
                <div>
                  <span>{label}</span>
                  <strong>{loading && !data.count ? "—" : value}</strong>
                </div>
              </div>
            ))}
          </div>
          <div className="um-list-panel">
            <div className="um-toolbar">
              <div
                className="um-tabs"
                role="group"
                aria-label="Фильтр по статусу"
              >
                {[
                  ["all", "Все", summary.total],
                  ["active", "Активные", summary.active],
                  ["inactive", "Отключённые", summary.inactive],
                ].map(([value, label, count]) => (
                  <button
                    type="button"
                    aria-pressed={status === value}
                    key={value}
                    onClick={() => {
                      setStatus(value);
                      setPage(1);
                    }}
                  >
                    {label}
                    <span>{count}</span>
                  </button>
                ))}
              </div>
              <div className="um-filters">
                <div className="um-search">
                  <Search size={17} aria-hidden="true" />
                  <input
                    type="search"
                    aria-label="Поиск по имени или почте"
                    placeholder="Имя или почта…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Очистить поиск"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                <div className="um-select">
                  <select
                    aria-label="Фильтр по роли"
                    value={role}
                    onChange={(event) => {
                      setRole(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">Все роли</option>
                    <option value="admin">Администратор</option>
                    <option value="helper">Помощник</option>
                  </select>
                  <ChevronDown size={14} aria-hidden="true" />
                </div>
              </div>
            </div>
            {listError ? (
              <div className="um-empty" role="alert">
                <AlertCircle size={28} />
                <h2>Не удалось загрузить пользователей</h2>
                <p>{listError.message}</p>
                <button
                  type="button"
                  className="um-button um-button--secondary"
                  onClick={() => setRefresh((value) => value + 1)}
                >
                  <RotateCw size={15} />
                  Повторить
                </button>
              </div>
            ) : !data.results.length ? (
              <div className="um-empty" role="status">
                {loading ? (
                  <LoaderCircle size={28} className="um-spin" />
                ) : (
                  <Search size={28} />
                )}
                <h2>
                  {loading ? "Загружаем пользователей" : "Ничего не найдено"}
                </h2>
                <p>
                  {loading
                    ? "Это займёт немного времени."
                    : "Попробуйте изменить запрос или сбросить фильтры."}
                </p>
                {!loading && (
                  <button
                    type="button"
                    className="um-button um-button--secondary"
                    onClick={() => {
                      setQuery("");
                      setDebounced("");
                      setStatus("all");
                      setRole("all");
                      setPage(1);
                    }}
                  >
                    Сбросить фильтры
                  </button>
                )}
              </div>
            ) : (
              <UsersTable
                users={data.results}
                busy={pending || loading}
                onAction={open}
              />
            )}
            <footer className="um-table-footer">
              <span aria-live="polite">
                {loading
                  ? "Обновляем список…"
                  : data.count
                    ? `Показано ${(data.page - 1) * data.page_size + 1}–${Math.min(data.page * data.page_size, data.count)} из ${data.count}`
                    : "Найдено: 0"}
              </span>
              <div className="um-pagination">
                <button
                  type="button"
                  className="um-icon-button"
                  aria-label="Предыдущая страница"
                  disabled={loading || data.page <= 1}
                  onClick={() => setPage(data.page - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <span>
                  {data.page} <i>/</i> {data.pages}
                </span>
                <button
                  type="button"
                  className="um-icon-button"
                  aria-label="Следующая страница"
                  disabled={loading || data.page >= data.pages}
                  onClick={() => setPage(data.page + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </footer>
          </div>
          <div className="um-footnote">
            <LockKeyhole size={15} />
            <p>
              Учётные записи создаёт администратор. Помощники могут
              просматривать черновики и оставлять комментарии.
            </p>
          </div>
        </section>
        <footer className="um-workspace-footer">
          <a href={scheduleHref}>
            <ArrowLeft size={14} />К расписанию
          </a>
          <span>
            <ShieldCheck size={14} />
            Главная учётная запись защищена
          </span>
        </footer>
      </div>
      {toast && (
        <div
          className={`um-toast ${toast.error ? "um-toast--error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <AlertCircle size={18} /> : <Check size={18} />}
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast("")}
            aria-label="Закрыть уведомление"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {dialog && !confirmation && (
        <UserDialog
          key={`${dialog.type}-${dialog.user?.id || "new"}`}
          {...dialog}
          busy={pending}
          failure={failure}
          onClose={close}
          onSubmit={save}
        />
      )}
      {confirmation && (
        <Modal
          compact
          title={
            dialog.type === "delete"
              ? "Удалить пользователя?"
              : dialog.type === "deactivate"
                ? "Отключить доступ?"
                : "Включить доступ?"
          }
          description={dialog.user.login}
          busy={pending}
          onClose={close}
        >
          <div
            className={`um-confirm-icon ${dialog.type === "delete" ? "um-confirm-icon--danger" : ""}`}
          >
            {dialog.type === "delete" ? (
              <UserRoundX size={27} />
            ) : (
              <LockKeyhole size={27} />
            )}
          </div>
          <p className="um-confirm-text">
            {dialog.type === "delete"
              ? "Учётная запись будет удалена. Это действие нельзя отменить. Если нужно временно закрыть вход, отключите доступ."
              : dialog.type === "deactivate"
                ? "Пользователь больше не сможет войти. Его учётная запись и связанные данные сохранятся."
                : "Пользователь снова сможет войти с действующим паролем."}
          </p>
          {failure && (
            <div className="um-alert" role="alert">
              <AlertCircle size={17} />
              <span>{failure.message}</span>
            </div>
          )}
          <div className="um-modal__footer">
            <button
              type="button"
              className="um-button um-button--secondary"
              disabled={pending}
              onClick={close}
            >
              Отмена
            </button>
            <button
              type="button"
              className={`um-button ${dialog.type === "delete" ? "um-button--danger" : ""}`}
              disabled={pending}
              onClick={() => save()}
            >
              {pending && <LoaderCircle size={16} className="um-spin" />}
              {pending
                ? "Сохраняем…"
                : dialog.type === "delete"
                  ? "Удалить"
                  : dialog.type === "deactivate"
                    ? "Отключить доступ"
                    : "Включить доступ"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
