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

// Mock data for testing the scoring logic before the tournament starts
export function getMockLeaderboard(): ESPNLeaderboard {
  return {
    eventName: "The Masters — Preview Mode",
    eventId: "mock",
    currentRound: 4,
    isComplete: true,
    players: [
      { displayName: "Scottie Scheffler",  score: -15, totalStrokes: 273, madeCut: true,  position: "1",   round: 4, status: "complete" },
      { displayName: "Rory McIlroy",       score: -12, totalStrokes: 276, madeCut: true,  position: "2",   round: 4, status: "complete" },
      { displayName: "Collin Morikawa",    score: -10, totalStrokes: 278, madeCut: true,  position: "T3",  round: 4, status: "complete" },
      { displayName: "Xander Schauffele",  score: -10, totalStrokes: 278, madeCut: true,  position: "T3",  round: 4, status: "complete" },
      { displayName: "Ludvig Åberg",       score: -9,  totalStrokes: 279, madeCut: true,  position: "5",   round: 4, status: "complete" },
      { displayName: "Tommy Fleetwood",    score: -8,  totalStrokes: 280, madeCut: true,  position: "T6",  round: 4, status: "complete" },
      { displayName: "Viktor Hovland",     score: -8,  totalStrokes: 280, madeCut: true,  position: "T6",  round: 4, status: "complete" },
      { displayName: "Jon Rahm",           score: -7,  totalStrokes: 281, madeCut: true,  position: "T8",  round: 4, status: "complete" },
      { displayName: "Patrick Cantlay",    score: -7,  totalStrokes: 281, madeCut: true,  position: "T8",  round: 4, status: "complete" },
      { displayName: "Shane Lowry",        score: -6,  totalStrokes: 282, madeCut: true,  position: "T10", round: 4, status: "complete" },
      { displayName: "Hideki Matsuyama",   score: -6,  totalStrokes: 282, madeCut: true,  position: "T10", round: 4, status: "complete" },
      { displayName: "Justin Thomas",      score: -5,  totalStrokes: 283, madeCut: true,  position: "T12", round: 4, status: "complete" },
      { displayName: "Jordan Spieth",      score: -5,  totalStrokes: 283, madeCut: true,  position: "T12", round: 4, status: "complete" },
      { displayName: "Brooks Koepka",      score: -4,  totalStrokes: 284, madeCut: true,  position: "T14", round: 4, status: "complete" },
      { displayName: "Bryson DeChambeau",  score: -4,  totalStrokes: 284, madeCut: true,  position: "T14", round: 4, status: "complete" },
      { displayName: "Sahith Theegala",    score: -3,  totalStrokes: 285, madeCut: true,  position: "T16", round: 4, status: "complete" },
      { displayName: "Wyndham Clark",      score: -3,  totalStrokes: 285, madeCut: true,  position: "T16", round: 4, status: "complete" },
      { displayName: "Russell Henley",     score: -2,  totalStrokes: 286, madeCut: true,  position: "T18", round: 4, status: "complete" },
      { displayName: "Min Woo Lee",        score: -2,  totalStrokes: 286, madeCut: true,  position: "T18", round: 4, status: "complete" },
      { displayName: "Akshay Bhatia",      score: -1,  totalStrokes: 287, madeCut: true,  position: "T20", round: 4, status: "complete" },
      { displayName: "Sepp Straka",        score:  0,  totalStrokes: 288, madeCut: true,  position: "T22", round: 4, status: "complete" },
      { displayName: "Adam Scott",         score:  1,  totalStrokes: 289, madeCut: true,  position: "T24", round: 4, status: "complete" },
      { displayName: "Dustin Johnson",     score:  2,  totalStrokes: 290, madeCut: true,  position: "T26", round: 4, status: "complete" },
      { displayName: "Tony Finau",         score:  3,  totalStrokes: 291, madeCut: true,  position: "T28", round: 4, status: "complete" },
      { displayName: "Tyrrell Hatton",     score:  4,  totalStrokes: 292, madeCut: true,  position: "T30", round: 4, status: "complete" },
      { displayName: "Rickie Fowler",      score:  5,  totalStrokes: 293, madeCut: true,  position: "T32", round: 4, status: "complete" },
      { displayName: "Cameron Young",      score:  6,  totalStrokes: 294, madeCut: true,  position: "T34", round: 4, status: "complete" },
      // Missed cut
      { displayName: "Tiger Woods",        score:  8,  totalStrokes: 152, madeCut: false, position: "MC",  round: 2, status: "cut" },
      { displayName: "Phil Mickelson",     score: 10,  totalStrokes: 154, madeCut: false, position: "MC",  round: 2, status: "cut" },
      { displayName: "Cameron Smith",      score:  7,  totalStrokes: 151, madeCut: false, position: "MC",  round: 2, status: "cut" },
      { displayName: "Justin Rose",        score:  9,  totalStrokes: 153, madeCut: false, position: "MC",  round: 2, status: "cut" },
    ],
  };
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
