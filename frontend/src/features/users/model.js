export function validateUserForm({
  type,
  display_name = "",
  login = "",
  password = "",
  confirmation = "",
}) {
  const errors = {};
  if (type === "create" || type === "edit") {
    if (!display_name.trim()) errors.display_name = "Введите отображаемое имя.";
    else if (Array.from(display_name.trim()).length > 250)
      errors.display_name = "Имя должно быть не длиннее 250 символов.";
    if (!login.trim()) errors.login = "Введите электронную почту.";
    else if (login.trim().length > 250)
      errors.login = "Адрес должен быть не длиннее 250 символов.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login.trim()))
      errors.login = "Проверьте адрес электронной почты.";
  }
  if (type === "create" || type === "password") {
    if (Array.from(password).length < 8)
      errors.password = "Используйте не менее 8 символов.";
    else if (Array.from(password).length > 128)
      errors.password = "Используйте не более 128 символов.";
    if (password !== confirmation)
      errors.confirmation = "Пароли должны совпадать.";
  }
  return errors;
}

export function initials(login, displayName = "") {
  const names = displayName.trim().split(/\s+/).filter(Boolean);
  if (names.length)
    return names
      .slice(0, 2)
      .map((name) => Array.from(name)[0])
      .join("")
      .toLocaleUpperCase("ru");
  const parts = login
    .split("@")[0]
    .split(/[._\-+]+/)
    .filter(Boolean);
  return (
    parts.length > 1 ? parts[0][0] + parts[1][0] : login.slice(0, 2)
  ).toLocaleUpperCase("ru");
}

export function lastSeen(value) {
  if (!value) return "Ещё не входил";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Дата неизвестна"
    : new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

export function createdOn(value) {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

export function generatePassword(cryptoImpl = globalThis.crypto) {
  const groups = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnpqrstuvwxyz",
    "23456789",
    "!@#$%*+-?",
  ];
  const all = groups.join("");
  const pick = (max) => {
    const values = new Uint32Array(1);
    const limit = Math.floor(2 ** 32 / max) * max;
    do {
      cryptoImpl.getRandomValues(values);
    } while (values[0] >= limit);
    return values[0] % max;
  };
  const chars = groups.map((group) => group[pick(group.length)]);
  while (chars.length < 16) chars.push(all[pick(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = pick(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
