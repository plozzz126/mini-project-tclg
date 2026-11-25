import { useEffect, useState } from 'react'
import { getShowFull } from '../api/tvmaze.js'

/** Полные данные (с сериями) для сериалов трекера. Ответы кешируются в getJson. */
export function useMyShows(ids) {
  const key = ids.join(',')
  const [state, setState] = useState({ key: null, shows: {}, errors: 0 })

  useEffect(() => {
    if (!key) return
    let alive = true
    Promise.allSettled(key.split(',').map((id) => getShowFull(id))).then((results) => {
      if (!alive) return
      const shows = {}
      let errors = 0
      results.forEach((r) => (r.status === 'fulfilled' ? (shows[r.value.id] = r.value) : errors++))
      setState({ key, shows, errors })
    })
    return () => {
      alive = false
    }
  }, [key])

  return state.key === key ? { ...state, loading: false } : { shows: {}, errors: 0, loading: Boolean(key) }
}
