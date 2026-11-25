// Личный вариант. Номер = номер в журнале (если больше 20 — вычесть 20).
// Чтобы сменить вариант, поменяйте только это число.
export const VARIANT = 1

const TASK = {
  CHRONO: 'chrono', // сортировка выставки по date_start, кнопка «Хронологически»
  PUBLIC_DOMAIN: 'publicDomain', // переключатель «Только общественное достояние»
  DEPARTMENTS: 'departments', // счётчик работ выставки по отделам
  RANDOM: 'random', // кнопка «Случайная работа по теме»
}
export { TASK }

const TASKS = [TASK.CHRONO, TASK.PUBLIC_DOMAIN, TASK.DEPARTMENTS, TASK.RANDOM]
const TOPICS = [
  ['cats', 'red'], ['horses', 'orange'], ['ships', 'yellow'], ['japan', 'green'],
  ['winter', 'blue'], ['music', 'purple'], ['birds', 'red'], ['flowers', 'orange'],
  ['chicago', 'yellow'], ['mountains', 'green'], ['children', 'blue'], ['dogs', 'purple'],
  ['fruit', 'red'], ['moon', 'orange'], ['dance', 'yellow'], ['armor', 'green'],
  ['gold', 'blue'], ['water', 'purple'], ['trees', 'red'], ['portrait', 'orange'],
]

const n = ((VARIANT - 1) % 20 + 20) % 20 // 0..19
export const variant = {
  number: n + 1,
  topic: TOPICS[n][0],
  color: TOPICS[n][1],
  task: TASKS[n % 4],
}

export const COLORS = [
  { value: '', label: 'Любой' },
  { value: 'red', label: 'Красный' },
  { value: 'orange', label: 'Оранжевый' },
  { value: 'yellow', label: 'Жёлтый' },
  { value: 'green', label: 'Зелёный' },
  { value: 'blue', label: 'Синий' },
  { value: 'purple', label: 'Фиолетовый' },
  { value: 'gray', label: 'Серый (бесцветный)' },
]
