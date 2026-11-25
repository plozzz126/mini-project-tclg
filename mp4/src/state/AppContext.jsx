import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { appReducer, favKey, loadState, saveState } from '../lib/store.js'

const AppContext = createContext(null)

/** Общее состояние приложения: избранное и прогнозы (useReducer + localStorage). */
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, undefined, () => loadState())
  useEffect(() => saveState(state), [state])

  const value = useMemo(() => {
    const favs = new Set(state.favorites.map(favKey))
    return {
      state,
      dispatch,
      isFavorite: (code, team) => favs.has(favKey({ code, team })),
    }
  }, [state])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp вне AppProvider')
  return ctx
}
