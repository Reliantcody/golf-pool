import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT p.name, COUNT(pk.id) as pick_count
      FROM participants p
      LEFT JOIN picks pk ON pk.participant_id = p.id
      GROUP BY p.id, p.name
      ORDER BY p.name
    `;
    const participants = rows.map((r) => ({
      name: r.name as string,
      pickCount: Number(r.pick_count),
    }));
    return NextResponse.json({ participants });
  } catch {
    return NextResponse.json({ participants: [] });
  }
}
