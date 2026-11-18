const TEACHER = /[А-ЯЁ][а-яё-]+\s+[А-ЯЁ]\.\s*[А-ЯЁ]\./u;

// Адаптер текста именно из предоставленной Excel-таблицы.
// Полный исходный текст остаётся в entry.raw и всегда доступен в подробностях.
export function lessonParts(entry) {
  const parts = [];
  let subject = [];
  for (const line of entry.raw.split(/\n/).map((value) => value.trim()).filter(Boolean)) {
    if (/^https?:\/\//i.test(line)) {
      if (parts.length) parts.at(-1).links.push(line);
      else subject.push(line);
    } else if (TEACHER.test(line)) {
      if (subject.length) {
        parts.push({ title: subject.join(" "), teachers: [line], links: [] });
        subject = [];
      } else if (parts.length) {
        parts.at(-1).teachers.push(line);
      } else {
        parts.push({ title: "Занятие", teachers: [line], links: [] });
      }
    } else {
      subject.push(line);
    }
  }
  if (subject.length) parts.push({ title: subject.join(" "), teachers: [], links: [] });
  return parts.length ? parts : [{ title: entry.raw, teachers: [], links: [] }];
}

export function lessonKind(entry, part) {
  if (/онлайн/i.test(part.teachers.join(" ")) || part.links.length) return "online";
  if (!part.teachers.length && entry.groups.length > 1) return "common";
  return "lesson";
}

export const KIND_LABELS = {
  lesson: "Занятие",
  online: "Онлайн",
  common: "Общая запись курса",
};

export function dateLabel(value) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

export function weekLabel(week) {
  const start = new Date(`${week.start}T12:00:00`);
  const end = new Date(`${week.end}T12:00:00`);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const last = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(end);
    return `${start.getDate()}–${last} ${end.getFullYear()}`;
  }
  return `${dateLabel(week.start)} — ${dateLabel(week.end)}`;
}

export function shortDay(value) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short" })
    .format(new Date(`${value}T12:00:00`));
}

export function initialSelection(data, today = new Date()) {
  const course = data.courses.find((item) => item.groups.includes("РИС-26-4")) || data.courses[0];
  const group = course.groups.includes("РИС-26-4") ? "РИС-26-4" : course.groups[0];
  const date = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")].join("-");
  return { course: course.name, group, day: data.days.some((item) => item.date === date)
    ? date : data.days[0].date };
}
