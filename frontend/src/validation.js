export function validateAuthForm({ mode, login, password, confirmation }) {
  const errors = {};
  const email = login.trim();
  if (!email) errors.login = "Введите электронную почту.";
  else if (!/^[^\s@]+@[^\s@]+$/.test(email))
    errors.login = "Проверьте адрес электронной почты.";
  if (!password) errors.password = "Введите пароль.";
  else if (mode === "register" && Array.from(password).length < 8)
    errors.password = "Используйте не менее 8 символов.";
  if (mode === "register" && confirmation !== password)
    errors.confirmation = "Пароли должны совпадать.";
  return errors;
}
