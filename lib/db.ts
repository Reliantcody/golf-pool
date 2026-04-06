import { neon } from "@neondatabase/serverless";

function getSQL() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  return neon(url);
}

export async function initDB() {
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS participants (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      pin_hash VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  // Add pin_hash to existing tables if upgrading
  await sql`
    ALTER TABLE participants ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(64)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS picks (
      id SERIAL PRIMARY KEY,
      participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      major_id VARCHAR(50) NOT NULL,
      player_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(participant_id, major_id, player_name)
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_participant_player_year
    ON picks(participant_id, lower(player_name))
  `;
}

export async function getOrCreateParticipant(name: string): Promise<number> {
  const sql = getSQL();
  const trimmed = name.trim();
  const existing = await sql`
    SELECT id FROM participants WHERE lower(name) = lower(${trimmed}) LIMIT 1
  `;
  if (existing.length > 0) return existing[0].id as number;
  const result = await sql`
    INSERT INTO participants (name) VALUES (${trimmed}) RETURNING id
  `;
  return result[0].id as number;
}

export async function getUsedPlayers(
  participantId: number
): Promise<{ player_name: string; major_id: string }[]> {
  const sql = getSQL();
  const result = await sql`
    SELECT player_name, major_id FROM picks
    WHERE participant_id = ${participantId}
    ORDER BY major_id, id
  `;
  return result as { player_name: string; major_id: string }[];
}

export async function submitPicks(
  participantId: number,
  majorId: string,
  players: string[]
): Promise<{ success: boolean; error?: string }> {
  const sql = getSQL();
  // Check for players already used in OTHER majors
  const used = await getUsedPlayers(participantId);
  const usedInOtherMajors = used
    .filter((u) => u.major_id !== majorId)
    .map((u) => u.player_name.toLowerCase());

  const duplicates = players.filter((p) =>
    usedInOtherMajors.includes(p.toLowerCase())
  );
  if (duplicates.length > 0) {
    return {
      success: false,
      error: `You already used these players in another major: ${duplicates.join(", ")}`,
    };
  }

  // Delete existing picks for this major (allow re-submission before deadline)
  await sql`
    DELETE FROM picks WHERE participant_id = ${participantId} AND major_id = ${majorId}
  `;

  for (const player of players) {
    await sql`
      INSERT INTO picks (participant_id, major_id, player_name)
      VALUES (${participantId}, ${majorId}, ${player.trim()})
    `;
  }

  return { success: true };
}

export interface ParticipantWithPicks {
  id: number;
  name: string;
  picks: Record<string, string[]>;
}

export async function getAllParticipantsWithPicks(): Promise<
  ParticipantWithPicks[]
> {
  const sql = getSQL();
  const participants = await sql`
    SELECT id, name FROM participants ORDER BY name
  `;
  const allPicks = await sql`
    SELECT participant_id, major_id, player_name
    FROM picks ORDER BY participant_id, major_id, id
  `;

  const picksByParticipant: Record<number, Record<string, string[]>> = {};
  for (const row of allPicks) {
    const pid = row.participant_id as number;
    const mid = row.major_id as string;
    if (!picksByParticipant[pid]) picksByParticipant[pid] = {};
    if (!picksByParticipant[pid][mid]) picksByParticipant[pid][mid] = [];
    picksByParticipant[pid][mid].push(row.player_name as string);
  }

  return participants.map((r) => ({
    id: r.id as number,
    name: r.name as string,
    picks: picksByParticipant[r.id as number] ?? {},
  }));
}

export async function getMajorPicks(
  majorId: string
): Promise<{ participantName: string; players: string[] }[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT p.name as participant_name, pk.player_name
    FROM picks pk
    JOIN participants p ON p.id = pk.participant_id
    WHERE pk.major_id = ${majorId}
    ORDER BY p.name, pk.id
  `;

  const grouped: Record<string, string[]> = {};
  for (const row of rows) {
    const n = row.participant_name as string;
    if (!grouped[n]) grouped[n] = [];
    grouped[n].push(row.player_name as string);
  }

  return Object.entries(grouped).map(([name, players]) => ({
    participantName: name,
    players,
  }));
}

export async function getUsedPlayersByName(
  participantName: string,
  excludeMajorId: string
): Promise<string[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT pk.player_name FROM picks pk
    JOIN participants p ON p.id = pk.participant_id
    WHERE lower(p.name) = lower(${participantName.trim()})
      AND pk.major_id != ${excludeMajorId}
    ORDER BY pk.major_id, pk.id
  `;
  return rows.map((r) => r.player_name as string);
}

// ── Auth ──────────────────────────────────────────────────────────

export interface ParticipantAuth {
  id: number;
  name: string;
  hasPin: boolean;
}

export async function findParticipantByName(
  name: string
): Promise<ParticipantAuth | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT id, name, pin_hash FROM participants
    WHERE lower(name) = lower(${name.trim()}) LIMIT 1
  `;
  if (rows.length === 0) return null;
  return {
    id: rows[0].id as number,
    name: rows[0].name as string,
    hasPin: !!rows[0].pin_hash,
  };
}

export async function verifyParticipantPin(
  name: string,
  pinHash: string
): Promise<ParticipantAuth | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT id, name FROM participants
    WHERE lower(name) = lower(${name.trim()})
      AND pin_hash = ${pinHash}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return { id: rows[0].id as number, name: rows[0].name as string, hasPin: true };
}

export async function registerParticipant(
  name: string,
  pinHash: string
): Promise<{ id: number; name: string }> {
  const sql = getSQL();
  const trimmed = name.trim();
  // Upsert: create or update PIN for this name
  const existing = await sql`
    SELECT id FROM participants WHERE lower(name) = lower(${trimmed}) LIMIT 1
  `;
  if (existing.length > 0) {
    // Set PIN on existing participant (only allowed if they have none)
    await sql`
      UPDATE participants SET pin_hash = ${pinHash}
      WHERE id = ${existing[0].id as number} AND pin_hash IS NULL
    `;
    return { id: existing[0].id as number, name: trimmed };
  }
  const result = await sql`
    INSERT INTO participants (name, pin_hash) VALUES (${trimmed}, ${pinHash}) RETURNING id
  `;
  return { id: result[0].id as number, name: trimmed };
}
