export interface Major {
  id: string;
  name: string;
  shortName: string;
  startDate: string; // ISO string
  endDate: string;
  submissionDeadline: string; // Wednesday 10 PM ET before the event
  espnKeywords: string[]; // words to match against ESPN event name
}

// 2026 Major schedule — submission deadline = Wednesday 10 PM ET the night before
export const MAJORS: Major[] = [
  {
    id: "masters-2026",
    name: "The Masters",
    shortName: "Masters",
    startDate: "2026-04-09T07:00:00Z",
    endDate: "2026-04-12T23:59:59Z",
    submissionDeadline: "2026-04-09T02:00:00Z", // Wed Apr 8, 10 PM ET = Apr 9 02:00 UTC
    espnKeywords: ["masters"],
  },
  {
    id: "pga-2026",
    name: "PGA Championship",
    shortName: "PGA Champ.",
    startDate: "2026-05-21T07:00:00Z",
    endDate: "2026-05-24T23:59:59Z",
    submissionDeadline: "2026-05-21T02:00:00Z", // Wed May 20, 10 PM ET
    espnKeywords: ["pga championship"],
  },
  {
    id: "usopen-2026",
    name: "U.S. Open",
    shortName: "US Open",
    startDate: "2026-06-18T07:00:00Z",
    endDate: "2026-06-21T23:59:59Z",
    submissionDeadline: "2026-06-18T02:00:00Z", // Wed Jun 17, 10 PM ET
    espnKeywords: ["u.s. open", "us open", "united states open"],
  },
  {
    id: "theopen-2026",
    name: "The Open Championship",
    shortName: "The Open",
    startDate: "2026-07-16T06:00:00Z",
    endDate: "2026-07-19T23:59:59Z",
    submissionDeadline: "2026-07-16T02:00:00Z", // Wed Jul 15, 10 PM ET
    espnKeywords: ["open championship", "british open"],
  },
];

export function getMajorById(id: string): Major | undefined {
  return MAJORS.find((m) => m.id === id);
}

export function getCurrentMajor(): Major | undefined {
  const now = new Date();
  return MAJORS.find(
    (m) => now >= new Date(m.startDate) && now <= new Date(m.endDate)
  );
}

export function getNextMajor(): Major | undefined {
  const now = new Date();
  return MAJORS.find((m) => now < new Date(m.startDate));
}

export function getActiveMajor(): Major | undefined {
  // Returns current (in-play) or next upcoming major
  return getCurrentMajor() ?? getNextMajor();
}

export function isSubmissionOpen(major: Major): boolean {
  return new Date() < new Date(major.submissionDeadline);
}

export function getMajorStatus(
  major: Major
): "upcoming" | "open" | "complete" {
  const now = new Date();
  if (now < new Date(major.startDate)) return "upcoming";
  if (now <= new Date(major.endDate)) return "open";
  return "complete";
}
