import React from "react";
import { BookOpen, CalendarDays, Users } from "lucide-react";
import Brand from "./Brand.jsx";
import ScheduleIllustration from "./ScheduleIllustration.jsx";

export default function Showcase() {
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
