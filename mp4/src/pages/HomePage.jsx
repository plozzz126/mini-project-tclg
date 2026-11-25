import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LEAGUES, SEASONS } from '../api/football.js'

export default function HomePage() {
  const [season, setSeason] = useState(SEASONS[1])
  const navigate = useNavigate()

  return (
    <section>
      <h1>Лиги Европы</h1>
      <p className="muted">
        Таблица, форма и статистика считаются прямо в браузере из списка матчей сезона (openfootball).
      </p>
      <label className="inline">
        Сезон:{' '}
        <select value={season} onChange={(e) => setSeason(e.target.value)}>
          {SEASONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('-', '/')}
              {s === SEASONS[0] ? ' (текущий)' : ''}
            </option>
          ))}
        </select>
      </label>
      <div className="leagues">
        {LEAGUES.map((l) => (
          <button key={l.code} type="button" className="league-card" onClick={() => navigate(`/league/${l.code}/${season}`)}>
            <span className="flag">{l.flag}</span>
            <strong>{l.title}</strong>
            <span className="muted">
              {l.name} · {l.code}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
