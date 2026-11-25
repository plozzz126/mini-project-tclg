// Соответствие названий клубов openfootball → id в TheSportsDB.
// id взяты со страниц клубов thesportsdb.com (/team/133604-arsenal) и проверены запросом lookupteam.php.
export const TEAMS_MAP = {
  // 20 клубов АПЛ 2024-25
  'AFC Bournemouth': 134301,
  'Arsenal FC': 133604,
  'Aston Villa FC': 133601,
  'Brentford FC': 134355,
  'Brighton & Hove Albion FC': 133619,
  'Chelsea FC': 133610,
  'Crystal Palace FC': 133632,
  'Everton FC': 133615,
  'Fulham FC': 133600,
  'Ipswich Town FC': 133622,
  'Leicester City FC': 133626,
  'Liverpool FC': 133602,
  'Manchester City FC': 133613,
  'Manchester United FC': 133612,
  'Newcastle United FC': 134777,
  'Nottingham Forest FC': 133720,
  'Southampton FC': 134778,
  'Tottenham Hotspur FC': 133616,
  'West Ham United FC': 133636,
  'Wolverhampton Wanderers FC': 133599,
  // клубы, которые появились в АПЛ в сезонах 2025-26 и 2026-27
  'Leeds United FC': 133635,
  'Sunderland AFC': 133603,
  'Coventry City FC': 133625,
  'Hull City AFC': 133617,
}

/** id клуба в TheSportsDB или null, если клуба нет в файле. */
export function teamIdByName(name) {
  return Object.hasOwn(TEAMS_MAP, name) ? TEAMS_MAP[name] : null
}
