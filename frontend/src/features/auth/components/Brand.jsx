import React from "react";
import { CalendarDays } from "lucide-react";

export default function Brand({ light = false }) {
  return (
    <div className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-mark">
        <CalendarDays size={23} strokeWidth={1.8} />
      </span>
      <span>
        Расписание<span className="brand-dot">.</span>
      </span>
    </div>
  );
}
