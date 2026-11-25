import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { leagueByCode } from '../api/football.js'
import { getPlayers, getTeamInfo, badgeUrl } from '../api/sportsdb.js'
import { teamIdByName } from '../data/teams-map.js'
import {
  biggestWin,
  buildTable,
  findRow,
  lastPlayedRound,
  positionsByRound,
  resultFor,
  scoreOf,
  teamForm,
  teamMatches,
} from '../lib/table.js'
import { comparePath, leaguePath, teamPath } from '../lib/paths.js'
import { useSeason } from '../state/useSeason.js'
import { useApp } from '../state/AppContext.jsx'
import Badge from '../components/Badge.jsx'
import Form from '../components/Form.jsx'
import PositionChart from '../components/PositionChart.jsx'
import { ErrorBox, Loading, NotFound } from '../components/Status.jsx'

function useTeamApi(id) {
  const [state, setState] = useState({ id: null, info: null, players: null, error: null, stale: false })
  useEffect(() => {
    if (!id) return
    let alive = true
    Promise.allSettled([getTeamInfo(id), getPlayers(id)]).then(([i, p]) => {
      if (!alive) return
      setState({
        id,
        info: i.status === 'fulfilled' ? i.value.data : null,
        players: p.status === 'fulfilled' ? p.value.data : null,
        stale: (i.value?.stale || p.value?.stale) ?? false,
        error: i.status === 'rejected' ? i.reason : p.status === 'rejected' ? p.reason : null,
      })
    })
    return () => {
      alive = false
    }
  }, [id])
  return state.id === id ? state : { info: null, players: null, error: null, loading: Boolean(id) }
}

export default function TeamPage() {
  const { code, season, team } = useParams()
  const league = leagueByCode(code)
  const { data, error, loading, retry } = useSeason(code, season)
  const { dispatch, isFavorite } = useApp()
  const id = teamIdByName(team)
  const api = useTeamApi(id)

  const matches = useMemo(() => data?.matches ?? [], [data])
  const stats = useMemo(() => {
    const list = teamMatches(matches, team)
    if (!list.length) return null
    return {
      list,
      row: findRow(buildTable(matches), team),
      home: findRow(buildTable(matches, { venue: 'home' }), team),
      away: findRow(buildTable(matches, { venue: 'away' }), team),
      form: teamForm(matches, team),
      best: biggestWin(matches, team),
      positions: positionsByRound(matches, team),
      teams: buildTable(matches).length,
      rounds: lastPlayedRound(matches),
    }
  }, [matches, team])

  if (!league) return <NotFound text="Такой лиги нет" />
  if (error) return <ErrorBox error={error} onRetry={retry} />
  if (loading) return <Loading />
  if (!stats) return <NotFound text={`Клуба «${team}» нет в этом сезоне`} />

  const { info, players } = api
  const fav = isFavorite(code, team)

  return (
    <section>
      <p className="crumbs">
        <Link to="/">Лиги</Link> › <Link to={leaguePath(code, season)}>{league.title} {season.replace('-', '/')}</Link> ›{' '}
        {team}
      </p>

      <header className="team-head">
        {info?.strBadge ? (
          <img className="team-badge" src={badgeUrl(info.strBadge)} alt={`Эмблема ${team}`} width="120" height="120" />
        ) : (
          <Badge team={team} size={120} urgent />
        )}
        <div>
          <h1>{team}</h1>
          <p className="big">
            {stats.row.position}-е место · {stats.row.points} очк. · форма <Form form={stats.form} />
          </p>
          <div className="toolbar">
            <button
              type="button"
              className={fav ? '' : 'primary'}
              onClick={() => dispatch({ type: 'TOGGLE_FAVORITE', code, season, team })}
            >
              {fav ? '★ В избранном' : '☆ В избранное'}
            </button>
            <Link to={comparePath(code, season, team)}>Сравнить с другим клубом →</Link>
          </div>
        </div>
      </header>

      <div className="cols">
        <div className="panel">
          <h2>О клубе</h2>
          {!id && <p className="muted">Клуба нет в файле соответствия — данные TheSportsDB не загружаются.</p>}
          {id && api.loading && <Loading text="Данные TheSportsDB…" />}
          {id && api.error && !info && <ErrorBox error={api.error} />}
          {api.stale && <p className="muted">Показаны сохранённые данные: TheSportsDB сейчас недоступен.</p>}
          {info && (
            <dl className="facts">
              {info.strStadium && (
                <>
                  <dt>Стадион</dt>
                  <dd>
                    {info.strStadium}
                    {Number(info.intStadiumCapacity) > 0 &&
                      `, ${Number(info.intStadiumCapacity).toLocaleString('ru-RU')} мест`}
                  </dd>
                </>
              )}
              {info.intFormedYear && (
                <>
                  <dt>Основан</dt>
                  <dd>{info.intFormedYear}</dd>
                </>
              )}
              {info.strLocation && (
                <>
                  <dt>Город</dt>
                  <dd>{info.strLocation}</dd>
                </>
              )}
            </dl>
          )}
          {info?.strDescriptionEN && <p className="desc">{info.strDescriptionEN.split('\n')[0].slice(0, 600)}…</p>}
        </div>

        <div className="panel">
          <h2>Итоги сезона</h2>
          <table className="mini">
            <thead>
              <tr>
                <th />
                <th>И</th>
                <th>В</th>
                <th>Н</th>
                <th>П</th>
                <th>М</th>
                <th>О</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Всего', stats.row],
                ['Дома', stats.home],
                ['В гостях', stats.away],
              ].map(([label, r]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{r.played}</td>
                  <td>{r.won}</td>
                  <td>{r.drawn}</td>
                  <td>{r.lost}</td>
                  <td>
                    {r.gf}–{r.ga}
                  </td>
                  <td>{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.best && (
            <p>
              Самая крупная победа:{' '}
              <b>
                {stats.best.gf}:{stats.best.ga}
              </b>{' '}
              — {stats.best.match.team1 === team ? `дома с ${stats.best.match.team2}` : `в гостях у ${stats.best.match.team1}`},{' '}
              {stats.best.match.date}
            </p>
          )}
        </div>
      </div>

      {stats.positions.length > 1 && (
        <div className="panel">
          <h2>Место по турам</h2>
          <PositionChart
            series={[{ team, color: 'var(--accent)', points: stats.positions }]}
            teamsCount={stats.teams}
            rounds={stats.rounds}
          />
        </div>
      )}

      {players?.length > 0 && (
        <div className="panel">
          <h2>Игроки (TheSportsDB)</h2>
          <ul className="players">
            {players.map((p) => (
              <li key={p.idPlayer}>
                {p.strThumb ? (
                  <img src={`${p.strThumb}/tiny`} alt="" width="48" height="48" loading="lazy" />
                ) : (
                  <span className="ph" aria-hidden="true">
                    👤
                  </span>
                )}
                <span>
                  <b>{p.strPlayer}</b>
                  <small className="muted">
                    {[p.strPosition, p.strNationality].filter(Boolean).join(' · ')}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel">
        <h2>Все матчи</h2>
        <ul className="matches">
          {stats.list.map((m) => {
            const s = scoreOf(m)
            const res = resultFor(m, team)
            const other = m.team1 === team ? m.team2 : m.team1
            return (
              <li key={`${m.date}${m.team1}`} className={res ? `res-${res}` : 'future'}>
                <span className="muted">{m.round.replace('Matchday', 'Тур')}</span>
                <span className="muted">{m.date}</span>
                <span>{m.team1 === team ? 'дома' : 'в гостях'}</span>
                <Link to={teamPath(code, season, other)}>{other}</Link>
                <b>{s ? (m.team1 === team ? `${s[0]}:${s[1]}` : `${s[1]}:${s[0]}`) : m.time ?? '—'}</b>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
