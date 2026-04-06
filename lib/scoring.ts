import { ESPNLeaderboard, ESPNPlayer, findPlayer } from "./espn";

export interface PlayerResult {
  name: string;
  espnName: string | null;
  score: number | null; // relative to par
  madeCut: boolean;
  adjusted: boolean; // true if replaced by worst-made-cut score
  notStarted: boolean;
}

export interface MajorResult {
  majorId: string;
  playerResults: PlayerResult[];
  missedCutCount: number;
  // Score for this major (sum of best 4 of 5, with adjustments)
  majorScore: number | null;
  isComplete: boolean;
  currentRound: number;
}

export interface ParticipantStanding {
  participantId: number;
  name: string;
  majorResults: MajorResult[];
  totalScore: number | null; // sum of all completed majors
  rank: number;
}

// Penalty for a player not found in the ESPN feed (e.g., not in the field)
const NOT_IN_FIELD_PENALTY = 20;

/**
 * Scoring rules:
 * - Pick 5 players per major
 * - Score = sum of best 4 players (drop worst)
 * - If MORE THAN 1 player misses the cut: all missed-cut players
 *   get the score of the worst player who made the cut (in the full field)
 */
export function scoreMajor(
  picks: string[],
  leaderboard: ESPNLeaderboard
): MajorResult {
  const { players, isComplete, currentRound } = leaderboard;

  // Find the worst (highest) score among players who made the cut in the full field
  const madeCutPlayers = players.filter((p) => p.madeCut && p.score !== null);
  const worstMadeCutScore =
    madeCutPlayers.length > 0
      ? Math.max(...madeCutPlayers.map((p) => p.score!))
      : NOT_IN_FIELD_PENALTY;

  // Resolve each pick
  const playerResults: PlayerResult[] = picks.map((pickName) => {
    const found: ESPNPlayer | undefined = findPlayer(pickName, players);

    if (!found) {
      // Player not found — not in field or name mismatch
      return {
        name: pickName,
        espnName: null,
        score: NOT_IN_FIELD_PENALTY,
        madeCut: false,
        adjusted: false,
        notStarted: currentRound === 0,
      };
    }

    return {
      name: pickName,
      espnName: found.displayName,
      score: found.score,
      madeCut: found.madeCut,
      adjusted: false,
      notStarted: found.round === 0,
    };
  });

  const missedCutCount = playerResults.filter((p) => !p.madeCut && !p.notStarted).length;
  const madeCutCount = playerResults.filter((p) => p.madeCut).length;

  // Apply missed cut rule: if fewer than 4 of your 6 players made the cut,
  // replace all missed-cut players with the worst made-cut score in the full field
  let adjustedResults = playerResults.map((p) => ({ ...p }));
  if (madeCutCount < 4 && missedCutCount > 0) {
    adjustedResults = adjustedResults.map((p) => {
      if (!p.madeCut && !p.notStarted) {
        return { ...p, score: worstMadeCutScore, adjusted: true };
      }
      return p;
    });
  }

  // If tournament hasn't started yet, no score
  if (adjustedResults.every((p) => p.notStarted)) {
    return {
      majorId: "",
      playerResults,
      missedCutCount,
      majorScore: null,
      isComplete,
      currentRound,
    };
  }

  // Sort by score (ascending = better) and take best 4
  const scores = adjustedResults
    .filter((p) => p.score !== null)
    .map((p) => p.score!);

  if (scores.length === 0) {
    return {
      majorId: "",
      playerResults,
      missedCutCount,
      majorScore: null,
      isComplete,
      currentRound,
    };
  }

  scores.sort((a, b) => a - b);
  const best4 = scores.slice(0, 4);
  const majorScore = best4.reduce((sum, s) => sum + s, 0);

  return {
    majorId: "",
    playerResults: adjustedResults,
    missedCutCount,
    majorScore,
    isComplete,
    currentRound,
  };
}

export function formatScore(score: number | null): string {
  if (score === null) return "--";
  if (score === 0) return "E";
  return score > 0 ? `+${score}` : `${score}`;
}

export function rankStandings(standings: ParticipantStanding[]): ParticipantStanding[] {
  const withScore = standings.filter((s) => s.totalScore !== null);
  const withoutScore = standings.filter((s) => s.totalScore === null);

  withScore.sort((a, b) => (a.totalScore ?? 0) - (b.totalScore ?? 0));

  let rank = 1;
  withScore.forEach((s, i) => {
    if (i > 0 && s.totalScore !== withScore[i - 1].totalScore) {
      rank = i + 1;
    }
    s.rank = rank;
  });

  withoutScore.forEach((s) => {
    s.rank = withScore.length + 1;
  });

  return [...withScore, ...withoutScore];
}
