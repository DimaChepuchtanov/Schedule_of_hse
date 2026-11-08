import { Link } from "react-router";
import { PortalBrand } from "../features/portal/PortalArt.jsx";

export default function PublicSchedule() {
  return <div className="portal portal-home">
    <header><PortalBrand /></header>
    <main className="portal-public-schedule">
      <h1>Расписание учебных занятий</h1>
      <p>Здесь появится опубликованное расписание.</p>
      <Link to="/">На главную</Link>
    </main>
  </div>;
}
