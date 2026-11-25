import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { expoReducer, loadExpo, saveExpo, MAX_EXPO } from '../lib/art.js'

const ExpoContext = createContext(null)

export function ExpoProvider({ children }) {
  // выставка меняется только через действия expoReducer
  const [expo, dispatch] = useReducer(expoReducer, undefined, () => loadExpo())

  useEffect(() => saveExpo(expo), [expo])

  const value = useMemo(() => {
    const ids = new Set(expo.items.map((it) => it.id))
    return {
      expo,
      dispatch,
      has: (id) => ids.has(id),
      isFull: expo.items.length >= MAX_EXPO,
    }
  }, [expo])

  return <ExpoContext.Provider value={value}>{children}</ExpoContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useExpo() {
  const ctx = useContext(ExpoContext)
  if (!ctx) throw new Error('useExpo вне ExpoProvider')
  return ctx
}
