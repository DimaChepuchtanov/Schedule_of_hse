import { ArrowRight, Building2, Clock3, DoorOpen, GraduationCap } from "lucide-react";
import { Link } from "react-router";
import { DIRECTORIES } from "../catalog.js";

const ICONS = {
  universities: GraduationCap,
  buildings: Building2,
  rooms: DoorOpen,
  time_slots: Clock3,
};

export default function DirectoryCards({ data, directoryHref }) {
  return (
    <nav className="directories__cards" aria-label="Справочники">
      {DIRECTORIES.map((directory) => {
        const Icon = ICONS[directory.key];
        return (
          <Link
            className="directories__card"
            key={directory.key}
            to={directoryHref(directory.key)}
          >
            <Icon className="directories__card-icon" size={30} aria-hidden="true" />
            <h2>{directory.title}</h2>
            <p>{directory.description}</p>
            <span className="directories__card-footer">
              <span>Записей: {data[directory.key].length}</span>
              <ArrowRight size={20} aria-hidden="true" />
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
