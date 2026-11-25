import { useEffect, useState } from 'react'
import { getTeamInfo, badgeUrl } from '../api/sportsdb.js'
import { teamIdByName } from '../data/teams-map.js'

/** Эмблема клуба из TheSportsDB; если клуба нет в teams-map — кружок с буквами. */
export default function Badge({ team, size = 28, urgent = false }) {
  const id = teamIdByName(team)
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!id) return
    let alive = true
    getTeamInfo(id, { urgent })
      .then(({ data }) => alive && setSrc(badgeUrl(data?.strBadge, size > 50 ? 'small' : 'tiny')))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [id, size, urgent])

  if (id && src && !failed) {
    return <img className="badge" src={src} alt="" width={size} height={size} onError={() => setFailed(true)} />
  }
  const letters = team
    .replace(/\b(FC|AFC|CF|SC|AC|SS|SSC|US|1\.|VfL|VfB|TSG|RC|OGC|Stade|Club|de|FK)\b/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
  return (
    <span className="badge initials" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {letters}
    </span>
  )
}
