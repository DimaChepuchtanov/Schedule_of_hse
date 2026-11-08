import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { PortalBrand, TimetableArt } from "../features/portal/PortalArt.jsx";

export default function HomePage() {
  return <div className="portal portal-home">
    <header><PortalBrand /></header>
    <main className="portal-hero">
      <TimetableArt />
      <div className="portal-hero-copy">
        <h1>Расписание учебных занятий</h1>
        <Link className="portal-primary" to="/schedule/">Посмотреть расписание <ArrowRight /></Link>
      </div>
    </main>
  </div>;
}
