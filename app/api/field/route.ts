import { NextRequest, NextResponse } from "next/server";
import { getMajorById, getMajorStatus } from "@/lib/majors";
import { fetchLeaderboard } from "@/lib/espn";

// Fallback top players if ESPN doesn't have the field yet
const TOP_PGA_PLAYERS = [
  "Scottie Scheffler", "Rory McIlroy", "Xander Schauffele", "Collin Morikawa",
  "Viktor Hovland", "Ludvig Åberg", "Tommy Fleetwood", "Patrick Cantlay",
  "Wyndham Clark", "Shane Lowry", "Russell Henley", "Hideki Matsuyama",
  "Brooks Koepka", "Jon Rahm", "Cameron Smith", "Tony Finau",
  "Tyrrell Hatton", "Brian Harman", "Sahith Theegala", "Akshay Bhatia",
  "Sepp Straka", "Min Woo Lee", "Corey Conners", "Jason Day",
  "Adam Scott", "Dustin Johnson", "Jordan Spieth", "Justin Thomas",
  "Tiger Woods", "Bryson DeChambeau", "Sungjae Im", "Tom Kim",
  "Harris English", "Max Homa", "J.J. Spaun", "Taylor Moore",
  "Nicolai Højgaard", "Rasmus Højgaard", "Cameron Young", "Sam Burns",
  "Justin Rose", "Matt Fitzpatrick", "Billy Horschel", "Luke Donald",
  "Ryan Fox", "Keegan Bradley", "Nick Taylor", "Mackenzie Hughes",
  "Keith Mitchell", "Rickie Fowler", "Will Zalatoris", "Denny McCarthy",
  "Luke List", "Davis Riley", "Alex Noren", "Laurie Canter",
  "Robert MacIntyre", "Thriston Lawrence", "Dean Burmester", "Garrick Higgo",
  "Adrian Meronk", "Thomas Detry", "Victor Perez", "Guido Migliozzi",
  "Danny Willett", "Martin Kaymer", "Francesco Molinari", "Henrik Stenson",
  "Charl Schwartzel", "Bubba Watson", "Mike Weir", "Trevor Immelman",
  "Angel Cabrera", "Sandy Lyle", "Bernhard Langer", "Larry Mize",
  "Fred Couples", "Jose Maria Olazabal", "Ian Woosnam", "Nick Faldo",
  "Seve Ballesteros", "Christiaan Bezuidenhout", "Erik van Rooyen",
  "Abraham Ancer", "Carlos Ortiz", "Sebastian Munoz", "Emiliano Grillo",
  "Camilo Villegas", "Patrick Reed", "Zach Johnson", "Matt Kuchar",
  "Stewart Cink", "Kevin Kisner", "Brandt Snedeker", "Webb Simpson",
  "Jim Furyk", "Phil Mickelson", "Sergio Garcia", "Lee Westwood",
  "Paul Casey", "Ian Poulter", "Graeme McDowell", "Padraig Harrington",
  "Retief Goosen", "Vijay Singh", "Ernie Els", "Darren Clarke",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const majorId = searchParams.get("majorId");

  if (!majorId) {
    return NextResponse.json({ players: TOP_PGA_PLAYERS.sort() });
  }

  const major = getMajorById(majorId);
  if (!major) {
    return NextResponse.json({ players: TOP_PGA_PLAYERS.sort() });
  }

  try {
    const status = getMajorStatus(major);

    // Try to get field from ESPN if tournament is upcoming or in-progress
    const leaderboard = await fetchLeaderboard(major);
    if (leaderboard && leaderboard.players.length > 0) {
      const espnPlayers = leaderboard.players
        .map((p) => p.displayName)
        .filter(Boolean)
        .sort();
      return NextResponse.json(
        { players: espnPlayers, source: "espn" },
        { headers: { "Cache-Control": "public, max-age=3600" } }
      );
    }

    // Fallback
    return NextResponse.json(
      { players: TOP_PGA_PLAYERS.sort(), source: "fallback" },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  } catch {
    return NextResponse.json({ players: TOP_PGA_PLAYERS.sort(), source: "fallback" });
  }
}
