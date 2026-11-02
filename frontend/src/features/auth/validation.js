export function validateAuthForm({ login, password }) {
  const errors = {};
  const email = login.trim();
  if (!email) errors.login = "Введите электронную почту.";
  else if (email.length > 250)
    errors.login = "Адрес должен быть не длиннее 250 символов.";
  else if (!/^[^\s@]+@[^\s@]+$/.test(email))
    errors.login = "Проверьте адрес электронной почты.";
  if (!password) errors.password = "Введите пароль.";
  return errors;
}
