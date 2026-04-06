"use client";
import { useState, useRef, useEffect, useCallback } from "react";

interface PlayerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  players: string[];
  usedPlayers: string[];
  placeholder?: string;
  index: number;
}

export default function PlayerAutocomplete({
  value,
  onChange,
  players,
  usedPlayers,
  placeholder,
  index,
}: PlayerAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const usedSet = new Set(usedPlayers.map((p) => p.toLowerCase()));
  const isUsed = usedSet.has(value.toLowerCase()) && value.length > 0;

  const filtered = query.length < 2
    ? []
    : players.filter((p) =>
        p.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = useCallback(
    (player: string) => {
      onChange(player);
      setQuery(player);
      setOpen(false);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filtered.length === 0) {
      if (e.key === "ArrowDown" && filtered.length > 0) setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) select(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[highlighted] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (query.length >= 2) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? `Player ${index + 1} — type to search`}
        autoComplete="off"
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
          isUsed
            ? "border-red-400 focus:ring-red-400 bg-red-50"
            : "border-gray-300 focus:ring-green-500 bg-white"
        }`}
        required
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto text-sm"
        >
          {filtered.map((player, i) => {
            const playerUsed = usedSet.has(player.toLowerCase());
            return (
              <li
                key={player}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (!playerUsed) select(player);
                }}
                className={`px-3 py-2 flex items-center justify-between cursor-pointer ${
                  playerUsed
                    ? "text-gray-400 cursor-not-allowed bg-gray-50"
                    : i === highlighted
                    ? "bg-green-100 text-green-900"
                    : "hover:bg-green-50"
                }`}
              >
                <span>{player}</span>
                {playerUsed && (
                  <span className="text-xs text-orange-500 ml-2 flex-shrink-0">
                    Already used
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {open && query.length >= 2 && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
          No players found — check spelling or type the full name
        </div>
      )}
    </div>
  );
}
