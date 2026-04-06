// Run with: node scripts/migrate.mjs
// Requires DATABASE_URL env var to be set (copy from Vercel dashboard)

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log("Running database migration...");

  await sql`
    CREATE TABLE IF NOT EXISTS participants (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("✓ participants table");

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
  console.log("✓ picks table");

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_participant_player_year
    ON picks(participant_id, lower(player_name))
  `;
  console.log("✓ unique player index");

  console.log("\nMigration complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
