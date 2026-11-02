import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, createAuthApi } from "../src/features/auth/api.js";
import { validateAuthForm } from "../src/features/auth/validation.js";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("Every mutation gets a fresh CSRF token; passwords keep whitespace", async () => {
  const calls = [];
  let token = 0;
  const api = createAuthApi({
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      if (url.endsWith("/csrf/"))
        return json({ csrfToken: `token-${++token}` });
      return json({});
    },
  });
  await api.login({
    login: "person@example.org",
    password: "  password value  ",
  });
  await api.logout();
  assert.deepEqual(
    calls.map(([url]) => url),
    ["/api/csrf/", "/api/auth/", "/api/csrf/", "/api/logout/"],
  );
  assert.equal(calls[1][1].headers["X-CSRFToken"], "token-1");
  assert.equal(calls[3][1].headers["X-CSRFToken"], "token-2");
  assert.equal(JSON.parse(calls[1][1].body).password, "  password value  ");
  assert.ok(calls.every(([, options]) => options.credentials === "include"));
});

test("DRF field errors are available to the form", async () => {
  const api = createAuthApi({
    fetchImpl: async (url) =>
      url.endsWith("/csrf/")
        ? json({ csrfToken: "token" })
        : json(
            {
              login: ["Этот логин уже занят."],
              password: ["Пароль слишком простой."],
            },
            400,
          ),
  });
  await assert.rejects(
    api.register({ login: "person@example.org", password: "password" }),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      assert.equal(error.fields.login, "Этот логин уже занят.");
      assert.equal(error.fields.password, "Пароль слишком простой.");
      return true;
    },
  );
});

test("A Django HTML CSRF error is not exposed as HTML", async () => {
  const api = createAuthApi({
    fetchImpl: async (url) =>
      url.endsWith("/csrf/")
        ? json({ csrfToken: "token" })
        : new Response(
            "<html>CSRF verification failed: internal details</html>",
            { status: 403 },
          ),
  });
  await assert.rejects(
    api.login({ login: "person@example.org", password: "password" }),
    (error) => {
      assert.equal(error.status, 403);
      assert.match(error.message, /Обновите страницу/);
      assert.ok(!error.message.includes("<html>"));
      return true;
    },
  );
});

test("Malformed session responses are rejected", async () => {
  const api = createAuthApi({ fetchImpl: async () => json({ user: {} }) });
  await assert.rejects(api.session(), /Не удалось проверить вход/);
});

test("Session response includes the authenticated user", async () => {
  const api = createAuthApi({
    fetchImpl: async () =>
      json({
        authenticated: true,
        user: { id: "42", login: "person@example.org" },
      }),
  });
  assert.equal((await api.session()).user.login, "person@example.org");
});

test("Network failures return a useful message", async () => {
  const api = createAuthApi({
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
  });
  await assert.rejects(api.session(), /Не удалось связаться с сервером/);
});

test("Login accepts existing passwords; registration checks confirmation", () => {
  assert.deepEqual(
    validateAuthForm({
      mode: "login",
      login: "person@example.org",
      password: "old",
      confirmation: "",
    }),
    {},
  );
  const errors = validateAuthForm({
    mode: "register",
    login: "person@example.org",
    password: "long enough",
    confirmation: "different",
  });
  assert.equal(errors.confirmation, "Пароли должны совпадать.");
  assert.equal(
    validateAuthForm({
      mode: "register",
      login: "",
      password: "",
      confirmation: "",
    }).login,
    "Введите электронную почту.",
  );
});

test("Registration counts Unicode code points consistently with Python", () => {
  const short = "🧠🧠🧠🧠";
  assert.equal(
    validateAuthForm({
      mode: "register",
      login: "person@example.org",
      password: short,
      confirmation: short,
    }).password,
    "Используйте не менее 8 символов.",
  );
});
