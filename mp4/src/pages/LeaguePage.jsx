import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { leagueByCode, SEASONS } from '../api/football.js'
import { lastPlayedRound, tableAfterRound, teamForm, totalRounds } from '../lib/table.js'
import { comparePath, leaguePath, teamPath } from '../lib/paths.js'
import { useSeason } from '../state/useSeason.js'
import { useApp } from '../state/AppContext.jsx'
import Badge from '../components/Badge.jsx'
import Form from '../components/Form.jsx'
import { ErrorBox, Loading, NotFound } from '../components/Status.jsx'

const VENUES = [
  ['all', 'Все'],
  ['home', 'Дома'],
  ['away', 'В гостях'],
]

export default function LeaguePage() {
  const { code, season } = useParams()
  const league = leagueByCode(code)
  const { data, error, loading, retry } = useSeason(code, season)
  const [params, setParams] = useSearchParams()
  const { isFavorite } = useApp()

  const matches = useMemo(() => data?.matches ?? [], [data])
  const lastRound = useMemo(() => lastPlayedRound(matches), [matches])
  const rounds = useMemo(() => totalRounds(matches), [matches])

  const venue = params.get('venue') ?? 'all'
  const half = params.get('half') === 'ht' ? 'ht' : 'ft'
  const rules = params.get('rules') ?? (code === 'es.1' ? 'laliga' : 'epl')
  const round = Math.min(Number(params.get('round')) || lastRound, lastRound)

  const set = (k, v) => {
    const next = new URLSearchParams(params)
    next.set(k, v)
    setParams(next, { replace: true })
  }

  // 380 матчей не пересчитываются при каждом рендере
  const table = useMemo(
    () => tableAfterRound(matches, round, { venue, half, rules }),
    [matches, round, venue, half, rules],
  )
  const forms = useMemo(() => {
    const upTo = matches.filter((m) => (Number(/\d+/.exec(m.round)?.[0]) || 0) <= round)
    return Object.fromEntries(table.map((r) => [r.team, teamForm(upTo, r.team)]))
  }, [matches, table, round])

  if (!league || !SEASONS.includes(season) || error?.status === 404) {
    return <NotFound text="Такой лиги или сезона нет" />
  }
  if (error) return <ErrorBox error={error} onRetry={retry} />
  if (loading) return <Loading text="Загружаю матчи сезона…" />

  const n = table.length
  const zone = (i) => (i < 4 ? 'ucl' : i >= n - 3 ? 'rel' : '')

  return (
    <section>
      <p className="crumbs">
        <Link to="/">Лиги</Link> ›{' '}
        {league.flag} {league.title}
      </p>
      <h1>
        {data.name || league.title}
      </h1>
      <div className="seasons">
        {SEASONS.map((s) => (
          <Link key={s} to={leaguePath(code, s)} className={s === season ? 'active' : ''}>
            {s.replace('-', '/')}
          </Link>
        ))}
      </div>

      {lastRound === 0 ? (
        <p className="status">В этом сезоне ещё не сыграно ни одного матча.</p>
      ) : (
        <>
          <div className="controls">
            <label className="slider">
              После тура <b>{round}</b> из {rounds}
              <input
                type="range"
                min="1"
                max={lastRound}
                value={round}
                onChange={(e) => set('round', e.target.value)}
              />
            </label>
            <div className="seg" role="group" aria-label="Матчи">
              {VENUES.map(([v, label]) => (
                <button key={v} type="button" className={venue === v ? 'on' : ''} onClick={() => set('venue', v)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="seg" role="group" aria-label="Счёт">
              <button type="button" className={half === 'ft' ? 'on' : ''} onClick={() => set('half', 'ft')}>
                Итог матча
              </button>
              <button
                type="button"
                className={half === 'ht' ? 'on' : ''}
                onClick={() => set('half', 'ht')}
                title="Кто выиграл бы, если матчи заканчивались в перерыве"
              >
                Первый тайм
              </button>
            </div>
            <label className="inline">
              При равенстве очков:{' '}
              <select value={rules} onChange={(e) => set('rules', e.target.value)}>
                <option value="epl">разница мячей (АПЛ)</option>
                <option value="laliga">личные встречи (Ла Лига)</option>
              </select>
            </label>
            <Link to={comparePath(code, season, table[0]?.team, table[1]?.team)}>Сравнить клубы →</Link>
          </div>

          <div className="table-wrap">
            <table className="standings">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="club">Клуб</th>
                  <th title="Игры">И</th>
                  <th title="Победы">В</th>
                  <th title="Ничьи">Н</th>
                  <th title="Поражения">П</th>
                  <th title="Мячи">М</th>
                  <th title="Разница мячей">±</th>
                  <th title="Очки">О</th>
                  <th className="form-col">Форма</th>
                </tr>
              </thead>
              <tbody>
                {table.map((r, i) => (
                  <tr key={r.team} className={zone(i)}>
                    <td className="pos">{i + 1}</td>
                    <td className="club">
                      <Link to={teamPath(code, season, r.team)}>
                        <Badge team={r.team} size={24} />
                        <span>{r.team}</span>
                        {isFavorite(code, r.team) && <span title="В избранном">★</span>}
                      </Link>
                    </td>
                    <td>{r.played}</td>
                    <td>{r.won}</td>
                    <td>{r.drawn}</td>
                    <td>{r.lost}</td>
                    <td>
                      {r.gf}–{r.ga}
                    </td>
                    <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                    <td className="pts">{r.points}</td>
                    <td className="form-col">
                      <Form form={forms[r.team]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="legend-zones">
            <span className="ucl-key" /> Лига чемпионов (1–4) <span className="rel-key" /> Зона вылета (3 последних)
          </p>
        </>
      )}
    </section>
  )
}
