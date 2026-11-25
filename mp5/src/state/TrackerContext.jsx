import { createContext, useContext, useEffect, useReducer } from 'react'
import { loadTracker, saveTracker, trackerReducer } from '../lib/tracker.js'

const TrackerContext = createContext(null)

/** Общее состояние трекера: useReducer + localStorage, раздаётся через Context. */
export function TrackerProvider({ children }) {
  const [tracker, dispatch] = useReducer(trackerReducer, undefined, () => loadTracker())
  useEffect(() => saveTracker(tracker), [tracker])
  return <TrackerContext.Provider value={{ tracker, dispatch }}>{children}</TrackerContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTracker() {
  const ctx = useContext(TrackerContext)
  if (!ctx) throw new Error('useTracker вне TrackerProvider')
  return ctx
}
