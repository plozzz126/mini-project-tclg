import { Link } from 'react-router-dom'
import { leagueByCode } from '../api/football.js'
import { teamPath } from '../lib/paths.js'
import { useApp } from '../state/AppContext.jsx'
import Badge from '../components/Badge.jsx'

export default function FavoritesPage() {
  const { state, dispatch } = useApp()
  const favs = state.favorites

  return (
    <section>
      <h1>Избранное</h1>
      {favs.length === 0 ? (
        <p className="status">
          Пока пусто. Откройте страницу клуба и нажмите «☆ В избранное». <Link to="/">К лигам</Link>
        </p>
      ) : (
        <ul className="fav-list">
          {favs.map((f) => (
            <li key={`${f.code}|${f.team}`}>
              <Link to={teamPath(f.code, f.season, f.team)}>
                <Badge team={f.team} size={36} />
                <span>
                  <b>{f.team}</b>
                  <small className="muted">
                    {leagueByCode(f.code)?.title} · {f.season.replace('-', '/')}
                  </small>
                </span>
              </Link>
              <button type="button" className="danger" onClick={() => dispatch({ type: 'TOGGLE_FAVORITE', ...f })}>
                Убрать
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
