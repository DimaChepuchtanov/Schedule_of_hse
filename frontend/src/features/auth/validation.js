export function validateAuthForm({ mode = "login", login, password, confirmation }) {
  const errors = {};
  const email = login.trim();
  if (!email) errors.login = "Введите электронную почту.";
  else if (email.length > 250)
    errors.login = "Адрес должен быть не длиннее 250 символов.";
  else if (!/^[^\s@]+@[^\s@]+$/.test(email))
    errors.login = "Проверьте адрес электронной почты.";
  if (!password) errors.password = "Введите пароль.";
  else if (mode === "register" && [...password].length < 8)
    errors.password = "Используйте не менее 8 символов.";
  if (mode === "register" && password !== confirmation)
    errors.confirmation = "Пароли должны совпадать.";
  return errors;
}
