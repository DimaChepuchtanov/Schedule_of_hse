const env = import.meta.env || {};

export class UsersApiError extends Error {
  constructor(message, { status = 0, fields = {} } = {}) {
    super(message);
    this.name = "UsersApiError";
    this.status = status;
    this.fields = fields;
  }
}

function messageOf(value) {
  if (Array.isArray(value))
    return value.map(messageOf).filter(Boolean).join(" ");
  return typeof value === "string" ? value.slice(0, 2000) : "";
}

export function createUsersApi({
  prefix = "/api",
  fetchImpl = globalThis.fetch.bind(globalThis),
  timeoutMs = 15000,
} = {}) {
  if (
    !prefix.startsWith("/") ||
    prefix.startsWith("//") ||
    /[?#\\]/.test(prefix)
  ) {
    throw new Error("API prefix must be a path on the same origin.");
  }
  const base = prefix.replace(/\/+$/, "");

  async function request(path, { method = "GET", body, token, signal } = {}) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    signal?.addEventListener("abort", abort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      const response = await fetchImpl(base + path, {
        method,
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(token ? { "X-CSRFToken": token } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        /* Never show server HTML. */
      }
      if (!response.ok) {
        const fields = {};
        for (const key of ["display_name", "login", "password", "is_active"]) {
          const value = messageOf(data?.[key]);
          if (value) fields[key] = value;
        }
        const message =
          response.status >= 500
            ? "Сервер временно недоступен. Попробуйте ещё раз."
            : messageOf(data?.detail) ||
              (response.status === 401
                ? "Сессия завершена. Войдите в аккаунт ещё раз."
                : response.status === 403
                  ? "Нет доступа или не удалось подтвердить запрос. Обновите страницу."
                  : response.status === 404
                    ? "Не удалось найти пользователя или сервис управления."
                    : Object.keys(fields).length
                      ? "Проверьте отмеченные поля."
                      : "Не удалось выполнить запрос.");
        throw new UsersApiError(message, { status: response.status, fields });
      }
      if ((text && data === null) || (!text && response.status !== 204)) {
        throw new UsersApiError("Сервер вернул неожиданный ответ.");
      }
      return data;
    } catch (error) {
      if (error instanceof UsersApiError || signal?.aborted) throw error;
      throw new UsersApiError(
        timedOut
          ? "Сервер отвечает слишком долго. Повторите запрос."
          : "Нет соединения с сервером. Попробуйте ещё раз.",
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }

  async function mutate(path, method, body) {
    const csrf = await request("/csrf/");
    if (!csrf?.csrfToken || typeof csrf.csrfToken !== "string") {
      throw new UsersApiError(
        "Не удалось подготовить защищённый запрос. Обновите страницу.",
      );
    }
    return request(path, { method, body, token: csrf.csrfToken });
  }

  const item = (id) => `/users/${encodeURIComponent(id)}/`;
  return {
    async context(options) {
      const data = await request("/users/context/", options);
      if (
        typeof data?.user?.id !== "string" ||
        typeof data.user.login !== "string" ||
        typeof data.user.display_name !== "string"
      )
        throw new UsersApiError("Не удалось проверить учётную запись.");
      return data;
    },
    async list(
      { query = "", status = "all", role = "all", page = 1, pageSize = 6 } = {},
      options,
    ) {
      const params = new URLSearchParams({
        q: query,
        status,
        role,
        page: String(page),
        page_size: String(pageSize),
      });
      const data = await request(`/users/?${params}`, options);
      if (
        !Array.isArray(data?.results) ||
        !Number.isInteger(data?.count) ||
        !data?.summary
      ) {
        throw new UsersApiError("Не удалось прочитать список пользователей.");
      }
      return data;
    },
    create: (values) => mutate("/users/", "POST", values),
    update: (id, values) => mutate(item(id), "PATCH", values),
    password: (id, password) =>
      mutate(`${item(id)}password/`, "POST", { password }),
    remove: (id) => mutate(item(id), "DELETE"),
    logout: () => mutate("/logout/", "POST", {}),
  };
}

export const usersApi = createUsersApi({
  prefix: env.VITE_API_PREFIX || "/api",
});
