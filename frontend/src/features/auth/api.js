const runtimeEnv = import.meta.env || {};

export class ApiError extends Error {
  constructor(message, { status = 0, fields = {} } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

function errorText(value) {
  if (Array.isArray(value))
    return value.map(errorText).filter(Boolean).join(" ");
  if (value && typeof value === "object")
    return Object.values(value).map(errorText).filter(Boolean).join(" ");
  return typeof value === "string" ? value.slice(0, 2000) : "";
}

export function createAuthApi({
  prefix = "/api",
  fetchImpl = globalThis.fetch.bind(globalThis),
  timeoutMs = 15000,
} = {}) {
  if (
    !prefix.startsWith("/") ||
    prefix.startsWith("//") ||
    /[?#]/.test(prefix)
  ) {
    throw new Error("API prefix must be a path on the same origin.");
  }
  const base = prefix.replace(/\/+$/, "");

  async function request(
    path,
    { method = "GET", body, headers = {}, signal } = {},
  ) {
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetchImpl(`${base}${path}`, {
        method,
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const text = await response.text();
      let payload = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        /* HTML errors are never rendered. */
      }

      if (!response.ok) {
        const fields = {};
        for (const field of ["login", "password"]) {
          if (payload?.[field]) fields[field] = errorText(payload[field]);
        }
        let message =
          errorText(payload?.non_field_errors) || errorText(payload?.detail);
        if (response.status >= 500)
          message =
            "На сервере произошла ошибка. Попробуйте ещё раз немного позже.";
        if (response.status === 403 && (!payload || /csrf/i.test(message))) {
          message =
            "Не удалось подтвердить запрос. Обновите страницу и попробуйте ещё раз.";
        }
        if (!message) {
          message = Object.keys(fields).length
            ? "Проверьте отмеченные поля."
            : response.status === 404
              ? "Сервис входа недоступен. Попробуйте ещё раз позже."
              : "Не удалось выполнить запрос. Попробуйте ещё раз.";
        }
        throw new ApiError(message, { status: response.status, fields });
      }
      if (text && payload === null) {
        throw new ApiError(
          "Сервер вернул неожиданный ответ. Попробуйте ещё раз.",
        );
      }
      return payload;
    } catch (error) {
      if (error instanceof ApiError || signal?.aborted) throw error;
      throw new ApiError(
        timedOut
          ? "Сервер отвечает слишком долго. Попробуйте ещё раз."
          : "Не удалось связаться с сервером. Проверьте соединение и повторите попытку.",
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }

  async function post(path, body) {
    // A fresh token is fetched for every mutation, including after login rotates it.
    const csrf = await request("/csrf/");
    if (!csrf?.csrfToken || typeof csrf.csrfToken !== "string") {
      throw new ApiError(
        "Не удалось подготовить запрос. Обновите страницу и попробуйте ещё раз.",
      );
    }
    return request(path, {
      method: "POST",
      body,
      headers: { "X-CSRFToken": csrf.csrfToken },
    });
  }

  return {
    async session(options) {
      const data = await request("/me/", options);
      if (
        typeof data?.authenticated !== "boolean" ||
        (data.authenticated && typeof data.user?.login !== "string")
      ) {
        throw new ApiError("Не удалось проверить вход. Попробуйте ещё раз.");
      }
      return {
        authenticated: data.authenticated,
        user: data.authenticated ? data.user : null,
      };
    },
    login: (credentials) => post("/auth/", credentials),
    register: (credentials) => post("/reg/", credentials),
    logout: () => post("/logout/", {}),
  };
}

export const authApi = createAuthApi({
  prefix: runtimeEnv.VITE_API_PREFIX || "/api",
});
