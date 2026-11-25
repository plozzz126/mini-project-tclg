import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { leagueByCode } from '../api/football.js'
import { biggestWin, buildTable, findRow, lastPlayedRound, positionsByRound, scoreOf, teamForm } from '../lib/table.js'
import { leaguePath, teamPath } from '../lib/paths.js'
import { useSeason } from '../state/useSeason.js'
import Badge from '../components/Badge.jsx'
import Form from '../components/Form.jsx'
import PositionChart from '../components/PositionChart.jsx'
import { ErrorBox, Loading, NotFound } from '../components/Status.jsx'

const COLORS = ['#c2410c', '#2563eb']

export default function ComparePage() {
  const { code, season } = useParams()
  const league = leagueByCode(code)
  const { data, error, loading, retry } = useSeason(code, season)
  const [params, setParams] = useSearchParams()
  const matches = useMemo(() => data?.matches ?? [], [data])
  const table = useMemo(() => buildTable(matches), [matches])

  const a = params.get('a') || table[0]?.team
  const b = params.get('b') || table.find((r) => r.team !== a)?.team
  const pick = (k, v) => {
    const next = new URLSearchParams(params)
    next.set(k, v)
    setParams(next, { replace: true })
  }

  if (!league) return <NotFound />
  if (error) return <ErrorBox error={error} onRetry={retry} />
  if (loading) return <Loading />

  const teams = [a, b].filter((t) => table.some((r) => r.team === t))
  const rows = teams.map((t) => ({ ...findRow(table, t), form: teamForm(matches, t), best: biggestWin(matches, t) }))
  const h2h = matches.filter(
    (m) => scoreOf(m) && teams.length === 2 && teams.includes(m.team1) && teams.includes(m.team2),
  )

  const lines = [
    ['Место', (r) => r.position, 'low'],
    ['Очки', (r) => r.points],
    ['Победы', (r) => r.won],
    ['Ничьи', (r) => r.drawn, 'none'],
    ['Поражения', (r) => r.lost, 'low'],
    ['Забито', (r) => r.gf],
    ['Пропущено', (r) => r.ga, 'low'],
    ['Разница', (r) => r.gd],
  ]

  return (
    <section>
      <p className="crumbs">
        <Link to="/">Лиги</Link> › <Link to={leaguePath(code, season)}>{league.title} {season.replace('-', '/')}</Link> ›
        Сравнение
      </p>
      <h1>Сравнение клубов</h1>
      <div className="compare-pick">
        {['a', 'b'].map((k, i) => (
          <select key={k} value={k === 'a' ? a : b} onChange={(e) => pick(k, e.target.value)} style={{ borderColor: COLORS[i] }}>
            {table.map((r) => (
              <option key={r.team} value={r.team}>
                {r.team}
              </option>
            ))}
          </select>
        ))}
      </div>

      {rows.length === 2 && (
        <>
          <table className="compare">
            <thead>
              <tr>
                <th>
                  <Link to={teamPath(code, season, rows[0].team)}>
                    <Badge team={rows[0].team} size={40} /> {rows[0].team}
                  </Link>
                </th>
                <th />
                <th>
                  <Link to={teamPath(code, season, rows[1].team)}>
                    <Badge team={rows[1].team} size={40} /> {rows[1].team}
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map(([label, get, better]) => {
                const [x, y] = rows.map(get)
                const win = better === 'none' || x === y ? 0 : (better === 'low' ? x < y : x > y) ? 1 : 2
                return (
                  <tr key={label}>
                    <td className={win === 1 ? 'better' : ''}>{x}</td>
                    <th>{label}</th>
                    <td className={win === 2 ? 'better' : ''}>{y}</td>
                  </tr>
                )
              })}
              <tr>
                <td>
                  <Form form={rows[0].form} />
                </td>
                <th>Форма</th>
                <td>
                  <Form form={rows[1].form} />
                </td>
              </tr>
              <tr>
                <td>{rows[0].best ? `${rows[0].best.gf}:${rows[0].best.ga}` : '—'}</td>
                <th>Крупнейшая победа</th>
                <td>{rows[1].best ? `${rows[1].best.gf}:${rows[1].best.ga}` : '—'}</td>
              </tr>
            </tbody>
          </table>

          <h2>Личные встречи</h2>
          {h2h.length ? (
            <ul className="matches">
              {h2h.map((m) => {
                const s = scoreOf(m)
                return (
                  <li key={m.date}>
                    <span className="muted">{m.date}</span>
                    <span>
                      {m.team1} — {m.team2}
                    </span>
                    <b>
                      {s[0]}:{s[1]}
                    </b>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="muted">В этом сезоне ещё не встречались.</p>
          )}

          <h2>Место по турам</h2>
          <PositionChart
            series={rows.map((r, i) => ({ team: r.team, color: COLORS[i], points: positionsByRound(matches, r.team) }))}
            teamsCount={table.length}
            rounds={lastPlayedRound(matches)}
          />
        </>
      )}
    </section>
  )
}
