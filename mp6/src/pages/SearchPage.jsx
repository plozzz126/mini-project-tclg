import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { searchArtworks, PAGE_LIMIT } from '../api/artic.js'
import { maxPage, randomPage, RESULT_CAP } from '../lib/art.js'
import { COLORS, TASK, variant } from '../config.js'
import { useExpo } from '../expo/ExpoContext.jsx'
import ArtCard from '../components/ArtCard.jsx'
import { Empty, ErrorBox, Loading } from '../components/Status.jsx'

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { has } = useExpo()

  const q = params.get('q') ?? variant.topic
  const colorParam = params.get('color')
  const color = colorParam === null ? variant.color : colorParam === 'any' ? '' : colorParam
  const publicDomain = params.get('pd') === '1'
  // дальше 10 000-го результата API отвечает 403 — не даём уйти за предел
  const page = Math.min(
    maxPage(RESULT_CAP, PAGE_LIMIT),
    Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1),
  )

  const [draft, setDraft] = useState(q)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const [randomBusy, setRandomBusy] = useState(false)

  useEffect(() => setDraft(q), [q])

  useEffect(() => {
    // отмена устаревшего поиска, если пользователь уже ввёл новый
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    searchArtworks(q, page, { color, publicDomain, signal: ctrl.signal })
      .then((r) => {
        setResult(r)
        setLoading(false)
      })
      .catch((e) => {
        if (e.name === 'AbortError') return
        setError(e)
        setLoading(false)
      })
    return () => ctrl.abort()
  }, [q, page, color, publicDomain, retry])

  const update = (patch) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    if (!('page' in patch)) next.delete('page')
    setParams(next)
  }

  const last = result ? maxPage(result.pagination.total, PAGE_LIMIT) : 0
  const total = result?.pagination.total ?? 0

  async function openRandom() {
    setRandomBusy(true)
    setError(null)
    try {
      const first = await searchArtworks(q, 1, { color, publicDomain })
      const p = randomPage(maxPage(first.pagination.total, PAGE_LIMIT))
      if (!p) throw new Error('По этой теме нет работ')
      const r = p === 1 ? first : await searchArtworks(q, p, { color, publicDomain })
      const art = r.data[Math.floor(Math.random() * r.data.length)]
      if (!art) throw new Error('По этой теме нет работ')
      navigate(`/artwork/${art.id}`)
    } catch (e) {
      setError(e)
    } finally {
      setRandomBusy(false)
    }
  }

  return (
    <section>
      <h1>Поиск произведений</h1>
      <form
        className="search-form"
        onSubmit={(e) => {
          e.preventDefault()
          update({ q: draft.trim() || variant.topic })
        }}
      >
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Тема, например cats"
          aria-label="Поисковый запрос"
        />
        <select
          value={color || 'any'}
          onChange={(e) => update({ color: e.target.value })}
          aria-label="Фильтр по цвету"
        >
          {COLORS.map((c) => (
            <option key={c.value || 'any'} value={c.value || 'any'}>
              {c.label}
            </option>
          ))}
        </select>
        {variant.task === TASK.PUBLIC_DOMAIN && (
          <label className="toggle">
            <input
              type="checkbox"
              checked={publicDomain}
              onChange={(e) => update({ pd: e.target.checked ? '1' : null })}
            />
            Только общественное достояние
          </label>
        )}
        <button type="submit">Найти</button>
        {variant.task === TASK.RANDOM && (
          <button type="button" onClick={openRandom} disabled={randomBusy}>
            {randomBusy ? 'Ищу…' : '🎲 Случайная работа по теме'}
          </button>
        )}
      </form>

      {result && !error && (
        <p className="muted">
          Найдено: {total.toLocaleString('ru-RU')}
          {total > 10000 && ' (показать можно первые 10 000)'}
        </p>
      )}

      {loading && <Loading />}
      {error && <ErrorBox error={error} onRetry={() => setRetry((n) => n + 1)} />}
      {!loading && !error && result && result.data.length === 0 && <Empty />}

      {!loading && !error && result && result.data.length > 0 && (
        <>
          <div className="grid">
            {result.data.map((art) => (
              <ArtCard key={art.id} art={art} iiifUrl={result.config?.iiif_url} inExpo={has(art.id)} />
            ))}
          </div>
          <nav className="pager" aria-label="Страницы">
            <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
              ← Назад
            </button>
            <span>
              Страница {page} из {last}
            </span>
            <button type="button" disabled={page >= last} onClick={() => update({ page: String(page + 1) })}>
              Следующая страница →
            </button>
          </nav>
        </>
      )}
    </section>
  )
}
