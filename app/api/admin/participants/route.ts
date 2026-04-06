import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { hashPin } from "@/lib/auth";

function checkAdmin(req: NextRequest) {
  const auth = req.headers.get("x-admin-password");
  return auth === (process.env.ADMIN_PASSWORD ?? "changeme");
}

// GET: list all participants with PIN status
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT p.id, p.name, p.pin_hash IS NOT NULL as has_pin, p.created_at,
           COUNT(pk.id) as pick_count
    FROM participants p
    LEFT JOIN picks pk ON pk.participant_id = p.id
    GROUP BY p.id, p.name, p.pin_hash, p.created_at
    ORDER BY p.name
  `;
  return NextResponse.json({ participants: rows });
}

// POST: reset a participant's PIN
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { participantId, newPin } = await req.json();
  if (!participantId || !newPin || !/^\d{4,6}$/.test(newPin)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const sql = neon(process.env.DATABASE_URL!);
  await sql`UPDATE participants SET pin_hash = ${hashPin(newPin)} WHERE id = ${participantId}`;
  return NextResponse.json({ success: true });
}

// DELETE: remove a participant and all their picks
export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { participantId } = await req.json();
  if (!participantId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const sql = neon(process.env.DATABASE_URL!);
  await sql`DELETE FROM participants WHERE id = ${participantId}`;
  return NextResponse.json({ success: true });
}
