import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { ArrowRight, BookOpen, CalendarDays, FileUp, History, House, LogOut, Users } from "lucide-react";
import { authApi } from "../features/auth/api.js";
import { initials } from "../features/users/model.js";
import { PortalBrand, TimetableArt } from "../features/portal/PortalArt.jsx";

const sections = [
  { key: "overview", title: "Обзор", icon: House, to: "/menu/" },
  { title: "Загрузка данных", icon: FileUp, to: "/data-import/" },
  { key: "directories", title: "Справочники", icon: BookOpen, to: "/menu/?section=directories",
    description: "Просмотр справочников будет доступен после подключения базы данных расписаний." },
  { key: "generate", title: "Генерация расписания", icon: CalendarDays, to: "/menu/?section=generate",
    description: "Генератор готовится к запуску. Пока можно проверить учебный план и нагрузку преподавателей." },
  { key: "history", title: "История расписаний", icon: History, to: "/menu/?section=history",
    description: "Здесь появятся сохранённые версии расписаний." },
];

function Overview() {
  return <>
    <h1>Рабочий кабинет</h1>
    <section className="portal-feature">
      <div><h2>Подготовка расписания</h2>
        <p>Загрузите учебный план и нагрузку преподавателей.</p>
        <Link className="portal-primary" to="/menu/?section=generate">Перейти к генерации <ArrowRight /></Link>
      </div>
      <TimetableArt compact />
    </section>
    <section className="portal-recent">
      <h2>Последние расписания</h2>
      <div><CalendarDays size={46} strokeWidth={1.4} /><p>Здесь появятся сохранённые расписания</p></div>
    </section>
  </>;
}

export default function MenuPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    authApi.session({ signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setSession(result); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [attempt]);

  async function logout() {
    setLeaving(true);
    setError("");
    try {
      await authApi.logout();
      navigate("/", { replace: true });
    } catch (failure) {
      setError(failure.message);
      setLeaving(false);
    }
  }

  if (!session) return <main className="portal portal-public-schedule">
    {error ? <><p role="alert">{error}</p><button onClick={() => {setError(""); setAttempt(n => n+1);}}>Повторить</button></>
      : <p role="status">Проверяем вход…</p>}
  </main>;
  if (!session.authenticated) return <Navigate to="/auth/" replace />;

  const { user } = session;
  const name = user.display_name || user.login;
  const key = params.get("section") || "overview";
  const section = sections.find(item => item.key === key);

  return <div className="portal portal-workspace">
    <aside className="portal-sidebar">
      <PortalBrand />
      <div className="portal-account">
        <span className="portal-avatar">{initials(user.login, user.display_name || "")}</span>
        <div><strong>{name}</strong><Link to="/menu/?section=profile">Профиль</Link></div>
      </div>
      <nav aria-label="Разделы кабинета">
        {sections.map(({ key: id, title, icon: Icon, to }) =>
          <Link key={to} to={to} aria-current={id === key ? "page" : undefined}><Icon size={20} />{title}</Link>)}
        {user.is_superuser && <Link to="/admin/"><Users size={20} />Управление пользователями</Link>}
      </nav>
      <button className="portal-logout" onClick={logout} disabled={leaving}><LogOut size={20} />{leaving ? "Выходим…" : "Выйти"}</button>
      {error && <p role="alert">{error}</p>}
    </aside>
    <main className="portal-content">
      {key === "overview" ? <Overview /> : key === "profile" ? <>
        <h1>Профиль</h1><dl><dt>Имя сотрудника</dt><dd>{name}</dd><dt>Электронная почта</dt><dd>{user.login}</dd></dl>
      </> : section ? <>
        <h1>{section.title}</h1><p>{section.description}</p>
        {key === "generate" && <Link className="portal-primary" to="/data-import/">Проверить исходные данные <ArrowRight /></Link>}
      </> : <Navigate to="/menu/" replace />}
    </main>
  </div>;
}
