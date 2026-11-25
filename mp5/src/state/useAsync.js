import { useEffect, useState } from 'react'

/**
 * Загрузка данных по ключу: { data, error, loading, retry }.
 * Устаревший ответ (ключ уже сменился) игнорируется.
 */
export function useAsync(load, key) {
  const [attempt, setAttempt] = useState(0)
  const full = `${key}#${attempt}`
  const [state, setState] = useState({ key: null, data: null, error: null })

  useEffect(() => {
    if (key === null) return
    let alive = true
    load().then(
      (data) => alive && setState({ key: full, data, error: null }),
      (error) => alive && setState({ key: full, data: null, error }),
    )
    return () => {
      alive = false
    }
    // load меняется на каждом рендере — следим только за ключом
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full])

  const current = state.key === full
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: key !== null && !current,
    retry: () => setAttempt((n) => n + 1),
  }
}
