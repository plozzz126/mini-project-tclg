import { useEffect, useState } from 'react'
import { getSeason } from '../api/football.js'

/** Загрузка сезона: { data, error, loading, retry }. Сезон кешируется в Map внутри getSeason. */
export function useSeason(code, season) {
  const [state, setState] = useState({ key: null, data: null, error: null })
  const [attempt, setAttempt] = useState(0)
  const key = `${code}/${season}/${attempt}`

  useEffect(() => {
    let alive = true
    getSeason(code, season).then(
      (data) => alive && setState({ key, data, error: null }),
      (error) => alive && setState({ key, data: null, error }),
    )
    return () => {
      alive = false
    }
  }, [code, season, key])

  const current = state.key === key
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: !current,
    retry: () => setAttempt((n) => n + 1),
  }
}
