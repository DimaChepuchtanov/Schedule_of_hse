export const DIRECTORIES = [
  {
    key: "universities",
    title: "Университет",
    description: "Параметры вуза и учебные модули.",
    columns: [
      ["name", "Название"],
      ["timezone", "Часовой пояс"],
      ["pair_minutes", "Пара, мин"],
      ["academic_hour_minutes", "Академический час, мин"],
      ["transfer_minutes", "Переход, мин"],
    ],
  },
  {
    key: "buildings",
    title: "Корпуса",
    description: "Учебные корпуса и их адреса.",
    columns: [
      ["name", "Корпус"],
      ["address", "Адрес"],
      ["university", "Университет"],
    ],
  },
  {
    key: "rooms",
    title: "Аудитории",
    description: "Аудитории, вместимость и принадлежность к корпусу.",
    note: "Вместимость аудиторий пока указана как 50 мест: фактические значения требуют уточнения.",
    columns: [
      ["number", "Аудитория"],
      ["building", "Корпус"],
      ["capacity", "Вместимость"],
      ["room_type", "Тип"],
      ["is_active", "Активна"],
    ],
  },
  {
    key: "time_slots",
    title: "Время занятий",
    description: "Начало и окончание каждой пары.",
    columns: [
      ["number", "Пара"],
      ["starts_at", "Начало"],
      ["ends_at", "Окончание"],
    ],
  },
];

export const MODULES_TABLE = {
  key: "modules",
  title: "Учебные модули",
  description: "Периоды учебного года.",
  columns: [
    ["number", "Модуль"],
    ["academic_year", "Год начала"],
    ["starts_on", "Начало занятий"],
    ["ends_on", "Окончание занятий"],
  ],
};
