import { join } from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// The rest of this project uses `.env.local` (Next.js's convention), not
// plain `.env` — load it explicitly. Without this, running
// `npm run sync:players` standalone fails with "Missing
// NEXT_PUBLIC_SUPABASE_URL" even though .env.local has it.
config({ path: join(import.meta.dirname, '..', '.env.local') });

// Reuses the same public URL as the Next.js app (it's not secret) so this
// script only needs one extra credential: the service-role key.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ESPN_SEASON = Number(process.env.ESPN_SEASON || new Date().getFullYear());
const ESPN_LEAGUE_ID = process.env.ESPN_LEAGUE_ID;
const ESPN_SWID = process.env.ESPN_SWID;
const ESPN_S2 = process.env.ESPN_S2;
const LIMIT = Number(process.env.CACHE_LIMIT_PER_PLATFORM || 1000);
const ESPN_RANK_TYPE = process.env.ESPN_RANK_TYPE || 'STANDARD';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function espnHeadshotUrl(espnId) {
  if (!espnId) return null;
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`;
}

function toInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function normalizeName(first, last, full) {
  const generated = [first, last].filter(Boolean).join(' ').trim();
  return full || generated || null;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText} for ${url}\n${body.slice(0, 500)}`);
  }
  return response.json();
}

async function getSleeperTopPlayers() {
  const players = await fetchJson('https://api.sleeper.app/v1/players/nfl');

  const candidates = Object.values(players)
    .filter((p) => p && p.player_id)
    .filter((p) => Array.isArray(p.fantasy_positions) && p.fantasy_positions.length > 0)
    .filter((p) => p.position !== 'DEF')
    .map((p) => ({
      ...p,
      _rank: toInt(p.search_rank)
    }))
    .sort((a, b) => {
      const ar = a._rank ?? Number.MAX_SAFE_INTEGER;
      const br = b._rank ?? Number.MAX_SAFE_INTEGER;
      if (ar !== br) return ar - br;
      return String(a.full_name || '').localeCompare(String(b.full_name || ''));
    })
    .slice(0, LIMIT);

  return candidates.map((p, index) => ({
    sleeper_id: String(p.player_id),
    espn_id: toInt(p.espn_id),
    full_name: normalizeName(p.first_name, p.last_name, p.full_name),
    first_name: p.first_name || null,
    last_name: p.last_name || null,
    position: p.position || p.fantasy_positions?.[0] || null,
    nfl_team: p.team || null,
    status: p.status || null,
    headshot_url: espnHeadshotUrl(toInt(p.espn_id)),
    sleeper_rank: index + 1,
    in_sleeper_top_1000: true,
    mapping_source: p.espn_id ? 'sleeper:espn_id' : 'sleeper:unmapped',
    sleeper_updated_at: new Date().toISOString()
  }));
}

function buildEspnHeaders() {
  const fantasyFilter = {
    players: {
      limit: LIMIT,
      sortDraftRanks: {
        sortPriority: 100,
        sortAsc: true,
        value: ESPN_RANK_TYPE
      }
    }
  };

  const headers = {
    Accept: 'application/json',
    'X-Fantasy-Filter': JSON.stringify(fantasyFilter)
  };

  if (ESPN_SWID && ESPN_S2) {
    headers.Cookie = `espn_s2=${ESPN_S2}; SWID=${ESPN_SWID}`;
  }

  return headers;
}

function extractEspnPlayers(payload) {
  // ESPN has used both payload.players and payload[0].players-like shapes over time.
  if (Array.isArray(payload?.players)) return payload.players;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (Array.isArray(item?.players)) return item.players;
    }
  }
  return [];
}

function normalizeEspnPlayer(entry, index) {
  const p = entry?.player || entry;
  const id = toInt(p?.id);
  if (!id) return null;

  const fullName = p.fullName || p.full_name || p.name || null;
  const firstName = p.firstName || null;
  const lastName = p.lastName || null;
  const proTeamId = toInt(p.proTeamId);

  return {
    espn_id: id,
    full_name: normalizeName(firstName, lastName, fullName),
    first_name: firstName,
    last_name: lastName,
    position: p.defaultPositionId ? String(p.defaultPositionId) : null,
    nfl_team: proTeamId ? String(proTeamId) : null,
    status: p.injuryStatus || null,
    headshot_url: espnHeadshotUrl(id),
    espn_rank: index + 1,
    in_espn_top_1000: true,
    mapping_source: 'espn:player_pool',
    espn_updated_at: new Date().toISOString()
  };
}

async function getEspnTopPlayers() {
  const headers = buildEspnHeaders();

  // Public ESPN fantasy defaults endpoint. ESPN's fantasy API is undocumented,
  // so this URL may need adjustment in the future.
  const publicUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${ESPN_SEASON}/segments/0/leaguedefaults/1?view=kona_player_info`;

  let payload;
  try {
    payload = await fetchJson(publicUrl, { headers });
  } catch (publicError) {
    if (!ESPN_LEAGUE_ID || !ESPN_SWID || !ESPN_S2) throw publicError;

    // Fallback to the user's authenticated private league player pool.
    const leagueUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${ESPN_SEASON}/segments/0/leagues/${ESPN_LEAGUE_ID}?view=kona_player_info`;
    payload = await fetchJson(leagueUrl, { headers });
  }

  const players = extractEspnPlayers(payload)
    .slice(0, LIMIT)
    .map(normalizeEspnPlayer)
    .filter(Boolean);

  if (players.length === 0) {
    throw new Error('ESPN returned no players. Inspect the response shape / endpoint in Bruno and update extractEspnPlayers if ESPN changed it.');
  }

  return players;
}

function mergeRows(sleeperRows, espnRows) {
  const byEspn = new Map();
  const bySleeper = new Map();
  const merged = [];

  const add = (row) => {
    let target = null;
    if (row.espn_id && byEspn.has(row.espn_id)) target = byEspn.get(row.espn_id);
    if (!target && row.sleeper_id && bySleeper.has(row.sleeper_id)) target = bySleeper.get(row.sleeper_id);

    if (!target) {
      target = {
        sleeper_id: null,
        espn_id: null,
        full_name: null,
        first_name: null,
        last_name: null,
        position: null,
        nfl_team: null,
        status: null,
        headshot_url: null,
        sleeper_rank: null,
        espn_rank: null,
        in_sleeper_top_1000: false,
        in_espn_top_1000: false,
        mapping_source: null,
        sleeper_updated_at: null,
        espn_updated_at: null
      };
      merged.push(target);
    }

    for (const [key, value] of Object.entries(row)) {
      if (value !== null && value !== undefined) target[key] = value;
    }

    if (target.sleeper_id) bySleeper.set(target.sleeper_id, target);
    if (target.espn_id) byEspn.set(target.espn_id, target);
  };

  // Sleeper first because Sleeper directly provides an espn_id mapping for many players.
  sleeperRows.forEach(add);
  espnRows.forEach(add);

  for (const row of merged) {
    if (!row.headshot_url && row.espn_id) row.headshot_url = espnHeadshotUrl(row.espn_id);
    if (row.in_sleeper_top_1000 && row.in_espn_top_1000) row.mapping_source = 'sleeper:espn_id+espn:player_pool';
  }

  return merged;
}

async function upsertRows(rows) {
  // Upsert by ESPN ID where possible, then Sleeper ID for unmapped players.
  const withEspn = rows.filter((r) => r.espn_id);
  const sleeperOnly = rows.filter((r) => !r.espn_id && r.sleeper_id);

  const chunk = async (items, onConflict) => {
    const size = 250;
    for (let i = 0; i < items.length; i += size) {
      const batch = items.slice(i, i + size);
      const { error } = await supabase
        .from('player_identity_cache')
        .upsert(batch, { onConflict });
      if (error) throw error;
    }
  };

  await chunk(withEspn, 'espn_id');
  await chunk(sleeperOnly, 'sleeper_id');
}

async function resetCoverageFlags() {
  const { error } = await supabase
    .from('player_identity_cache')
    .update({
      in_sleeper_top_1000: false,
      in_espn_top_1000: false,
      sleeper_rank: null,
      espn_rank: null
    })
    .or('in_sleeper_top_1000.eq.true,in_espn_top_1000.eq.true');
  if (error) throw error;
}

async function main() {
  console.log(`Syncing up to ${LIMIT} ESPN + ${LIMIT} Sleeper players for ${ESPN_SEASON}...`);
  const [sleeperRows, espnRows] = await Promise.all([
    getSleeperTopPlayers(),
    getEspnTopPlayers()
  ]);

  console.log(`Sleeper rows: ${sleeperRows.length}`);
  console.log(`ESPN rows: ${espnRows.length}`);

  const merged = mergeRows(sleeperRows, espnRows);
  console.log(`Unique union rows: ${merged.length}`);
  console.log(`Mapped Sleeper→ESPN: ${merged.filter((r) => r.sleeper_id && r.espn_id).length}`);

  await resetCoverageFlags();
  await upsertRows(merged);

  console.log('Player identity cache sync complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
