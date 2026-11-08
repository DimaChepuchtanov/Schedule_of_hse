import { Link } from "react-router";
import "./portal.css";

export function PortalBrand() {
  return <Link className="portal-brand" to="/">
    <span aria-hidden="true" className="portal-mark"><i /><i /><i /><i /></span>
    Расписание.
  </Link>;
}

const days = ["Пн", "Вт", "Ср", "Чт", "Пт"];
const blocks = [[2,3,2], [3,5,1], [4,3,2], [5,2,2], [6,5,2], [2,9,2], [3,10,2], [4,12,2], [5,8,1], [6,11,3]];

export function TimetableArt({ compact = false }) {
  return <div aria-hidden="true" className={compact ? "portal-grid is-mini" : "portal-grid"}>
    {!compact && days.map((day, i) => <span key={day} style={{gridColumn:i+2, gridRow:1}}>{day}</span>)}
    {!compact && Array.from({length:13}, (_, i) =>
      <small key={i} style={{gridColumn:1, gridRow:i+2}}>{i+8}:00</small>)}
    {blocks.map(([column, row, height]) => <i key={column + "-" + row}
      style={{gridColumn:column, gridRow:row + " / span " + height}} />)}
  </div>;
}
