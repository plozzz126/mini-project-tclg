import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CURRENT_SEASON, LEAGUES, leagueByCode } from '../api/football.js'
import { matchKey, predictionPoints, predictionSummary, roundNumber, scoreOf } from '../lib/table.js'
import { teamPath } from '../lib/paths.js'
import { useSeason } from '../state/useSeason.js'
import { useApp } from '../state/AppContext.jsx'
import { ErrorBox, Loading } from '../components/Status.jsx'

const season = CURRENT_SEASON

function PredictionInput({ k, value, dispatch }) {
  const [home, setHome] = useState(value?.home ?? '')
  const [away, setAway] = useState(value?.away ?? '')
  const save = (h, a) => {
    if (h === '' && a === '') dispatch({ type: 'REMOVE_PREDICTION', key: k })
    else if (h !== '' && a !== '') dispatch({ type: 'SET_PREDICTION', key: k, home: h, away: a })
  }
  return (
    <span className="pred-input">
      <input
        type="number"
        min="0"
        max="20"
        inputMode="numeric"
        value={home}
        aria-label="Голы хозяев"
        onChange={(e) => {
          setHome(e.target.value)
          save(e.target.value, away)
        }}
      />
      :
      <input
        type="number"
        min="0"
        max="20"
        inputMode="numeric"
        value={away}
        aria-label="Голы гостей"
        onChange={(e) => {
          setAway(e.target.value)
          save(home, e.target.value)
        }}
      />
    </span>
  )
}

export default function PredictionsPage() {
  const [params, setParams] = useSearchParams()
  const code = leagueByCode(params.get('league'))?.code ?? 'en.1'
  const { data, error, loading, retry } = useSeason(code, season)
  const { state, dispatch } = useApp()
  const preds = state.predictions

  const matches = useMemo(() => data?.matches ?? [], [data])
  const upcoming = useMemo(() => {
    const list = matches.filter((m) => !scoreOf(m))
    const firstRound = Math.min(...list.map((m) => roundNumber(m.round) ?? Infinity))
    // ближайшие 2 тура, чтобы страница не была бесконечной
    return list.filter((m) => (roundNumber(m.round) ?? 0) <= firstRound + 1)
  }, [matches])
  const settled = useMemo(
    () => matches.filter((m) => scoreOf(m) && preds[matchKey(code, season, m)]),
    [matches, preds, code],
  )
  const summary = useMemo(() => predictionSummary(preds, matches, code, season), [preds, matches, code])

  return (
    <section>
      <h1>Мои прогнозы</h1>
      <p className="muted">
        Сезон {season.replace('-', '/')}. Точный счёт — 3 очка, угадан исход — 1 очко. Очки начисляются, когда матч сыгран.
      </p>
      <div className="seg" role="group" aria-label="Лига">
        {LEAGUES.map((l) => (
          <button key={l.code} type="button" className={code === l.code ? 'on' : ''} onClick={() => setParams({ league: l.code })}>
            {l.flag} {l.title}
          </button>
        ))}
      </div>

      {error && <ErrorBox error={error} onRetry={retry} />}
      {loading && <Loading />}
      {data && (
        <>
          <table className="mini summary">
            <thead>
              <tr>
                <th>Прогнозов</th>
                <th>Сыграно</th>
                <th>Точный счёт</th>
                <th>Исход</th>
                <th>Мимо</th>
                <th>Очки</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{summary.made}</td>
                <td>{summary.settled}</td>
                <td>{summary.exact}</td>
                <td>{summary.outcome}</td>
                <td>{summary.miss}</td>
                <td className="pts">{summary.points}</td>
              </tr>
            </tbody>
          </table>

          <h2>Ближайшие матчи</h2>
          {upcoming.length === 0 ? (
            <p className="muted">Все матчи сезона уже сыграны.</p>
          ) : (
            <ul className="matches predict">
              {upcoming.map((m) => {
                const k = matchKey(code, season, m)
                return (
                  <li key={k}>
                    <span className="muted">{m.round.replace('Matchday', 'Тур')}</span>
                    <span className="muted">
                      {m.date} {m.time}
                    </span>
                    <Link to={teamPath(code, season, m.team1)} className="right">
                      {m.team1}
                    </Link>
                    <PredictionInput k={k} value={preds[k]} dispatch={dispatch} />
                    <Link to={teamPath(code, season, m.team2)}>{m.team2}</Link>
                  </li>
                )
              })}
            </ul>
          )}

          <h2>Сыгранные матчи с прогнозом</h2>
          {settled.length === 0 ? (
            <p className="muted">Пока нет. Когда матч с вашим прогнозом сыграют, здесь появятся очки.</p>
          ) : (
            <table className="mini">
              <thead>
                <tr>
                  <th>Матч</th>
                  <th>Прогноз</th>
                  <th>Счёт</th>
                  <th>Очки</th>
                </tr>
              </thead>
              <tbody>
                {settled.map((m) => {
                  const p = preds[matchKey(code, season, m)]
                  const s = scoreOf(m)
                  const pts = predictionPoints(p, m)
                  return (
                    <tr key={matchKey(code, season, m)} className={`pp-${pts}`}>
                      <td>
                        {m.team1} — {m.team2}
                      </td>
                      <td>
                        {p.home}:{p.away}
                      </td>
                      <td>
                        {s[0]}:{s[1]}
                      </td>
                      <td className="pts">+{pts}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  )
}
