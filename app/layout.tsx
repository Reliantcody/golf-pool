import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Golf Pool 2026",
  description: "Major championship golf pool — pick 5 players per major",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="bg-green-900 text-white shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⛳</span>
              <div>
                <h1 className="text-xl font-bold leading-tight">Golf Pool 2026</h1>
                <p className="text-green-300 text-xs">4 Majors · Pick 5 Players Each</p>
              </div>
            </div>
            <nav className="flex gap-4 text-sm font-medium">
              <a href="/" className="text-green-200 hover:text-white transition-colors">
                Leaderboard
              </a>
              <a href="/picks" className="bg-yellow-500 hover:bg-yellow-400 text-green-900 px-3 py-1 rounded-full transition-colors font-semibold">
                My Picks
              </a>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-gray-400 border-t mt-8">
          Golf Pool 2026 · Scores via ESPN · Updates every 5 minutes
        </footer>
      </body>
    </html>
  );
}
