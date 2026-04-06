import { Major } from "./majors";

export interface ESPNPlayer {
  displayName: string;
  score: number | null; // relative to par (negative = under par)
  totalStrokes: number | null;
  madeCut: boolean;
  position: string;
  round: number; // current round (1-4)
  status: string;
}

export interface ESPNLeaderboard {
  eventName: string;
  eventId: string;
  players: ESPNPlayer[];
  currentRound: number;
  isComplete: boolean;
}

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/golf";

function parseScore(scoreStr: string | undefined | null): number | null {
  if (!scoreStr || scoreStr === "--") return null;
  if (scoreStr === "E") return 0;
  const n = parseInt(scoreStr.replace("+", ""), 10);
  return isNaN(n) ? null : n;
}

function parseCutStatus(competitor: Record<string, unknown>): boolean {
  // A player has made the cut if they're not in a cut/withdrawn/disqualified status
  const status = competitor?.status as Record<string, unknown> | undefined;
  const statusType = status?.type as Record<string, unknown> | undefined;
  const statusName = (statusType?.name as string) ?? "";
  const statusDesc = ((statusType?.description as string) ?? "").toLowerCase();
  const cutStatuses = ["STATUS_CUT", "STATUS_WITHDRAWN", "STATUS_WD", "STATUS_DQ"];
  if (cutStatuses.includes(statusName)) return false;
  if (statusDesc.includes("cut") || statusDesc.includes("withdraw") || statusDesc.includes("disqualif")) return false;
  return true;
}

export async function fetchLeaderboard(
  major: Major
): Promise<ESPNLeaderboard | null> {
  try {
    // First try: get the current scoreboard and find the matching major
    const res = await fetch(`${ESPN_BASE}/leaderboard?league=pga`, {
      next: { revalidate: 300 }, // cache 5 minutes
    });
    if (!res.ok) return null;
    const data = await res.json();

    const events: Record<string, unknown>[] = data?.events ?? [];

    // Find the event matching this major
    const event = events.find((e) => {
      const name = ((e?.name as string) ?? "").toLowerCase();
      return major.espnKeywords.some((kw) => name.includes(kw));
    });

    if (!event) return null;

    return parseESPNEvent(event);
  } catch {
    return null;
  }
}

export async function fetchLeaderboardById(
  eventId: string
): Promise<ESPNLeaderboard | null> {
  try {
    const res = await fetch(
      `${ESPN_BASE}/leaderboard?league=pga&event=${eventId}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const events: Record<string, unknown>[] = data?.events ?? [];
    if (!events[0]) return null;
    return parseESPNEvent(events[0]);
  } catch {
    return null;
  }
}

function parseESPNEvent(event: Record<string, unknown>): ESPNLeaderboard {
  const competitions = (event?.competitions as Record<string, unknown>[]) ?? [];
  const competition = competitions[0] ?? {};
  const competitors = (competition?.competitors as Record<string, unknown>[]) ?? [];

  const statusObj = event?.status as Record<string, unknown> | undefined;
  const statusType = statusObj?.type as Record<string, unknown> | undefined;
  const isComplete = statusType?.completed === true;
  const currentRound = parseInt(String(statusObj?.period ?? "1"), 10) || 1;

  const players: ESPNPlayer[] = competitors.map((c) => {
    const athlete = c?.athlete as Record<string, unknown> | undefined;
    const displayName = (athlete?.displayName as string) ?? "Unknown";
    const scoreStr = c?.score as string | undefined;
    const score = parseScore(scoreStr);
    const madeCut = parseCutStatus(c);

    // Try to get total strokes from linescores
    const linescores = (c?.linescores as Record<string, unknown>[]) ?? [];
    const totalStrokes = linescores.length > 0
      ? linescores.reduce((sum, ls) => {
          const val = parseInt(String(ls?.value ?? "0"), 10);
          return sum + (isNaN(val) ? 0 : val);
        }, 0)
      : null;

    const position = (c?.status as Record<string, unknown>)?.position as string ?? "";
    const round = linescores.length;

    return {
      displayName,
      score,
      totalStrokes: totalStrokes && totalStrokes > 0 ? totalStrokes : null,
      madeCut,
      position,
      round,
      status: String((c?.status as Record<string, unknown>)?.type ?? ""),
    };
  });

  return {
    eventName: (event?.name as string) ?? "Unknown Event",
    eventId: (event?.id as string) ?? "",
    players,
    currentRound,
    isComplete,
  };
}

export function findPlayer(
  name: string,
  players: ESPNPlayer[]
): ESPNPlayer | undefined {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  const target = normalize(name);

  // Exact match first
  let found = players.find((p) => normalize(p.displayName) === target);
  if (found) return found;

  // Last-name match
  const lastName = target.split(" ").pop() ?? "";
  found = players.find((p) => {
    const pLast = normalize(p.displayName).split(" ").pop() ?? "";
    return pLast === lastName;
  });
  return found;
}
