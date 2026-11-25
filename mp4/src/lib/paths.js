export const leaguePath = (code, season) => `/league/${code}/${season}`
export const teamPath = (code, season, team) => `/league/${code}/${season}/team/${encodeURIComponent(team)}`
export const comparePath = (code, season, a = '', b = '') =>
  `/league/${code}/${season}/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`
