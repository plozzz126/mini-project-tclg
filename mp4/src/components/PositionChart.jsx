/**
 * График места по турам (SVG-линия). 1-е место сверху.
 * series: [{ team, color, points: [{ round, position }] }]
 */
export default function PositionChart({ series, teamsCount, rounds }) {
  const W = 640
  const H = 260
  const pad = { l: 34, r: 12, t: 12, b: 28 }
  const maxRound = Math.max(rounds, 2)
  const x = (r) => pad.l + ((r - 1) / (maxRound - 1)) * (W - pad.l - pad.r)
  const y = (p) => pad.t + ((p - 1) / Math.max(teamsCount - 1, 1)) * (H - pad.t - pad.b)
  const yTicks = [1, 4, Math.round(teamsCount / 2), teamsCount - 2, teamsCount].filter(
    (v, i, a) => v >= 1 && a.indexOf(v) === i,
  )
  const xStep = maxRound > 20 ? 5 : maxRound > 10 ? 2 : 1
  const xTicks = []
  for (let r = 1; r <= maxRound; r += xStep) xTicks.push(r)

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Место в таблице по турам">
        {yTicks.map((p) => (
          <g key={p}>
            <line x1={pad.l} x2={W - pad.r} y1={y(p)} y2={y(p)} className="grid" />
            <text x={pad.l - 6} y={y(p) + 4} textAnchor="end" className="tick">
              {p}
            </text>
          </g>
        ))}
        {xTicks.map((r) => (
          <text key={r} x={x(r)} y={H - 8} textAnchor="middle" className="tick">
            {r}
          </text>
        ))}
        {series.map((s) =>
          s.points.length ? (
            <g key={s.team}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                points={s.points.map((p) => `${x(p.round)},${y(p.position)}`).join(' ')}
              />
              {s.points.length < 40 &&
                s.points.map((p) => (
                  <circle key={p.round} cx={x(p.round)} cy={y(p.position)} r="3" fill={s.color}>
                    <title>
                      {s.team}: тур {p.round}, {p.position}-е место
                    </title>
                  </circle>
                ))}
            </g>
          ) : null,
        )}
      </svg>
      {series.length > 1 && (
        <figcaption className="legend">
          {series.map((s) => (
            <span key={s.team}>
              <i style={{ background: s.color }} /> {s.team}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  )
}
