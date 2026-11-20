const API_PREFIX = (import.meta.env?.VITE_API_PREFIX || "/api").replace(/\/+$/, "");
const TIMEOUT_MS = 30000;

export class ScheduleApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ScheduleApiError";
    this.status = status;
  }
}

async function getJson(path, signal) {
  if (signal?.aborted) {
    throw new DOMException("Request aborted", "AbortError");
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  let timedOut = false;
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const response = await fetch(API_PREFIX + "/schedules/" + path, {
      signal: controller.signal,
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const isJson = response.headers.get("content-type")?.includes("application/json");
    let data = null;
    if (isJson) {
      try {
        data = await response.json();
      } catch {
        throw new ScheduleApiError("Сервис вернул некорректные данные.", response.status);
      }
    }

    if (!response.ok) {
      const detail = typeof data?.detail === "string" ? data.detail : null;
      throw new ScheduleApiError(
        detail || (
          response.status === 404
            ? "Расписание недоступно. Обновите список публикаций."
            : "Не удалось загрузить расписание. Попробуйте ещё раз."
        ),
        response.status,
      );
    }
    if (!isJson || !data || typeof data !== "object") {
      throw new ScheduleApiError("Сервис вернул некорректные данные.", response.status);
    }
    return data;
  } catch (error) {
    if (timedOut) {
      throw new ScheduleApiError("Загрузка занимает слишком много времени. Попробуйте ещё раз.");
    }
    if (error?.name === "AbortError" || error instanceof ScheduleApiError) throw error;
    throw new ScheduleApiError("Нет соединения с сервером. Проверьте подключение и повторите запрос.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export async function loadScheduleVersions({ signal } = {}) {
  const data = await getJson("", signal);
  if (!Array.isArray(data.results)) {
    throw new ScheduleApiError("Не удалось прочитать список опубликованных расписаний.");
  }
  return data.results;
}

export function loadPublishedSchedule(version, { signal } = {}) {
  if (!version?.module_id || !["BASE", "WEEKLY"].includes(version.kind)) {
    throw new ScheduleApiError("Выберите опубликованное расписание.");
  }
  const params = new URLSearchParams({
    module_id: String(version.module_id),
    kind: version.kind,
  });
  if (version.kind === "WEEKLY") {
    if (!version.week_start) {
      throw new ScheduleApiError("У выбранного расписания не указана неделя.");
    }
    params.set("week_start", version.week_start);
  }
  return getJson("published/?" + params.toString(), signal);
}
