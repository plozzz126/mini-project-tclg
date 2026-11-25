// Данные пользователя: избранные клубы и прогнозы. Меняются только через appReducer.

export const STORAGE_KEY = 'my-table:v1'
export const initialState = { favorites: [], predictions: {} }

/** Избранное: { code, season, team } — клуб запоминается вместе с лигой и сезоном. */
export const favKey = (f) => `${f.code}|${f.team}`

export function appReducer(state, action) {
  switch (action?.type) {
    case 'TOGGLE_FAVORITE': {
      const { code, season, team } = action
      if (!code || !team) return state
      const key = favKey({ code, team })
      const exists = state.favorites.some((f) => favKey(f) === key)
      return {
        ...state,
        favorites: exists
          ? state.favorites.filter((f) => favKey(f) !== key)
          : [...state.favorites, { code, season, team }],
      }
    }
    case 'SET_PREDICTION': {
      const home = Number(action.home)
      const away = Number(action.away)
      if (!action.key || !Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
        return state
      }
      return { ...state, predictions: { ...state.predictions, [action.key]: { home, away } } }
    }
    case 'REMOVE_PREDICTION': {
      if (!(action.key in state.predictions)) return state
      const { [action.key]: _removed, ...rest } = state.predictions
      return { ...state, predictions: rest }
    }
    default:
      return state
  }
}

/** Приводит данные из localStorage к правильной форме, мусор отбрасывает. */
export function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') return initialState
  const favorites = Array.isArray(raw.favorites)
    ? raw.favorites.filter((f) => f && typeof f.code === 'string' && typeof f.team === 'string')
    : []
  const predictions = {}
  if (raw.predictions && typeof raw.predictions === 'object') {
    for (const [k, p] of Object.entries(raw.predictions)) {
      if (p && Number.isInteger(p.home) && Number.isInteger(p.away) && p.home >= 0 && p.away >= 0) {
        predictions[k] = { home: p.home, away: p.away }
      }
    }
  }
  return { favorites, predictions }
}

export function loadState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    return raw ? normalizeState(JSON.parse(raw)) : initialState
  } catch {
    return initialState
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // хранилище недоступно — данные просто не сохранятся
  }
}
