const DAY_MS = 86400000;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const unique = (values) => [...new Set(values.filter(Boolean))];
const text = (value) => typeof value === "string" ? value.trim() : "";

export function isDate(value) {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const parsed = new Date(value + "T12:00:00Z");
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function todayISO(now = new Date()) {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export function addDays(iso, count) {
  const value = new Date(iso + "T12:00:00Z");
  return new Date(value.valueOf() + count * DAY_MS).toISOString().slice(0, 10);
}

export function mondayISO(today = todayISO()) {
  const weekday = new Date(today + "T12:00:00Z").getUTCDay();
  return addDays(today, -((weekday + 6) % 7));
}

export function formatDate(iso, options = {}) {
  if (!isDate(iso)) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    ...options,
  }).format(new Date(iso + "T12:00:00Z"));
}

export function formatWeek(iso) {
  if (!isDate(iso)) return "Типовая неделя";
  const end = addDays(iso, 6);
  const startMonth = iso.slice(0, 7);
  if (startMonth === end.slice(0, 7)) {
    return Number(iso.slice(8)) + "–" + formatDate(end, { year: "numeric" });
  }
  return formatDate(iso) + " – " + formatDate(end, { year: "numeric" });
}

export function moduleLabel(version) {
  const number = version.module_number ?? version.module__number;
  const year = version.academic_year ?? version.module__academic_year;
  const name = text(version.module_name);
  if (name) return name;
  const label = number ? "Модуль " + number : "Учебный модуль #" + version.module_id;
  return year ? label + " · " + year + "/" + (Number(year) + 1) : label;
}

export function normalizeVersions(rows) {
  const seen = new Set();
  return rows.map((row) => {
    if (!row || typeof row !== "object" || !text(row.uuid) ||
        !Number.isSafeInteger(row.module_id) || row.module_id < 1 ||
        !["BASE", "WEEKLY"].includes(row.kind) ||
        !Number.isInteger(row.revision) || row.revision < 1 ||
        (row.kind === "WEEKLY" && !isDate(row.week_start)) ||
        (row.kind === "BASE" && row.week_start != null && row.week_start !== "")) {
      throw new Error("В списке публикаций есть запись с некорректными данными.");
    }
    if (seen.has(row.uuid)) {
      throw new Error("В списке публикаций повторяется одна и та же версия.");
    }
    seen.add(row.uuid);
    return { ...row, week_start: row.kind === "BASE" ? null : row.week_start };
  }).sort((a, b) => (
    (b.week_start || "").localeCompare(a.week_start || "") ||
    String(b.published_at || "").localeCompare(String(a.published_at || "")) ||
    b.revision - a.revision
  ));
}

export function chooseDefaultVersion(versions, today = todayISO()) {
  const weekly = versions.filter((version) => version.kind === "WEEKLY");
  const monday = mondayISO(today);
  const current = weekly.find((version) => version.week_start === monday);
  if (current) return current;
  const past = weekly.filter((version) => version.week_start < monday)
    .sort((a, b) => b.week_start.localeCompare(a.week_start));
  if (past.length) return past[0];
  const future = weekly.filter((version) => version.week_start > monday)
    .sort((a, b) => a.week_start.localeCompare(b.week_start));
  return future[0] || versions[0] || null;
}

export function getModules(versions) {
  const modules = new Map();
  for (const version of versions) {
    if (!modules.has(version.module_id)) {
      modules.set(version.module_id, {
        id: version.module_id,
        label: moduleLabel(version),
      });
    }
  }
  return [...modules.values()];
}

export function normalizeSchedule(payload, version) {
  if (!payload || !["courses", "days", "times", "entries"].every(
    (key) => Array.isArray(payload[key]),
  )) {
    throw new Error("Не удалось прочитать данные расписания.");
  }
  if (version.kind === "WEEKLY" && payload.week?.start !== version.week_start) {
    throw new Error("Неделя внутри файла не совпадает с выбранным периодом.");
  }

  const dayKeys = new Set();
  const days = payload.days.map((day) => {
    const key = text(day?.date);
    if (!key || !text(day?.name) || dayKeys.has(key)) {
      throw new Error("В расписании некорректно указаны учебные дни.");
    }
    dayKeys.add(key);
    return { ...day, date: key, name: day.name.trim() };
  });

  const periods = new Set();
  const times = payload.times.map((time) => {
    const period = Number(time?.period);
    if (!Number.isInteger(period) || period < 1 || periods.has(period)) {
      throw new Error("В расписании некорректно указаны номера пар.");
    }
    periods.add(period);
    return {
      period,
      start: text(time.start),
      end: text(time.end),
    };
  }).sort((a, b) => a.period - b.period);

  const entries = payload.entries.map((entry, index) => {
    if (!entry || !dayKeys.has(entry.date) || !periods.has(Number(entry.period)) ||
        !Array.isArray(entry.groups) || !entry.groups.every((group) => typeof group === "string") ||
        (!text(entry.raw) && !text(entry.subject))) {
      throw new Error("В расписании есть занятие с некорректными данными.");
    }
    return {
      ...entry,
      id: String(entry.id || "lesson-" + index) + ":" + index,
      course: text(entry.course) || "Без курса",
      groups: unique(entry.groups.map((group) => group.trim())),
      period: Number(entry.period),
      raw: text(entry.raw) || text(entry.subject),
    };
  });

  const courses = new Map();
  for (const course of payload.courses) {
    if (!text(course?.name) || !Array.isArray(course.groups) ||
        !course.groups.every((group) => typeof group === "string")) {
      throw new Error("В расписании некорректно указаны курсы и группы.");
    }
    courses.set(course.name.trim(), unique(course.groups.map((group) => group.trim())));
  }
  for (const entry of entries) {
    courses.set(entry.course, unique([...(courses.get(entry.course) || []), ...entry.groups]));
  }

  return {
    days,
    times,
    entries,
    courses: [...courses].map(([name, groups]) => ({ name, groups })),
    note: text(payload.note),
  };
}

export function groupsForCourse(data, course) {
  return unique(data.courses.filter((item) => !course || item.name === course)
    .flatMap((item) => item.groups))
    .sort((a, b) => a.localeCompare(b, "ru", { numeric: true }));
}

export function searchable(value) {
  return String(value || "").toLocaleLowerCase("ru-RU").replaceAll("ё", "е").replace(/\s+/g, " ").trim();
}

export function filterEntries(data, { course = "", group = "", query = "" } = {}) {
  const terms = searchable(query).split(" ").filter(Boolean);
  return data.entries.filter((entry) => {
    if (course && entry.course !== course) return false;
    if (group && !entry.groups.includes(group)) return false;
    const haystack = searchable([
      entry.raw, entry.subject, entry.teacher, entry.room, entry.course, ...entry.groups,
    ].filter(Boolean).join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

export function lessonParts(entry) {
  const lines = entry.raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const title = text(entry.subject) || lines[0] || "Занятие";
  const type = searchable(entry.lesson_type || entry.type || "");
  let kind = "default";
  if (/лекц|lecture/.test(type)) kind = "lecture";
  if (/семинар|практ|seminar|practice/.test(type)) kind = "seminar";
  if (/лаб|laboratory/.test(type)) kind = "lab";
  return {
    title,
    description: text(entry.subject) ? entry.raw : lines.slice(1).join("\n"),
    kind,
    label: ({ lecture: "Лекция", seminar: "Семинар", lab: "Лабораторная" })[kind] || "Занятие",
  };
}
