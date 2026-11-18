const API_PREFIX = (import.meta.env.VITE_API_PREFIX || "/api").replace(/\/+$/, "");

export async function loadSchedule(signal) {
  const response = await fetch(`${API_PREFIX}/schedule/current/`, {
    signal,
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    cache: "no-cache",
  });
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;
  if (!response.ok) {
    throw new Error(data?.detail || `Не удалось загрузить расписание (${response.status}).`);
  }
  if (!data?.week || !["courses", "days", "times", "entries"].every((key) => Array.isArray(data[key]))) {
    throw new Error("Сервер вернул данные, которые не похожи на расписание.");
  }
  if (!data.courses.length || !data.days.length || !data.times.length) {
    throw new Error("В файле расписания не заполнены курсы, дни или время занятий.");
  }
  return data;
}
