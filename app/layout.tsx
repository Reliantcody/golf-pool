import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Golf Pool 2026",
  description: "Major championship golf pool — pick 5 players per major",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f3f4f2]">
        {/* Header */}
        <header className="bg-[#0a2b1e] shadow-lg">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <a href="/" className="flex items-center gap-3 group">
                <span className="text-2xl">⛳</span>
                <div>
                  <p className="text-white font-bold text-base leading-tight tracking-tight">Golf Pool 2026</p>
                  <p className="text-green-400 text-[11px] leading-tight">4 Majors · Pick 6 · Score 4</p>
                </div>
              </a>
              <nav className="flex items-center gap-3 text-sm font-semibold">
                <a href="/" className="text-green-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10">
                  Leaderboard
                </a>
                <a href="/picks" className="bg-[#c9a84c] hover:bg-[#d4b86a] text-[#0a2b1e] px-4 py-1.5 rounded-full transition-colors font-bold text-sm shadow">
                  My Picks
                </a>
              </nav>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>

        <footer className="max-w-5xl mx-auto px-4 py-6 mt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400">
          <span>Golf Pool 2026</span>
          <span>Scores via ESPN · Updates every 5 min</span>
          <a href="/admin" className="hover:text-gray-600 transition-colors">Admin</a>
        </footer>
      </body>
    </html>
  );
}
