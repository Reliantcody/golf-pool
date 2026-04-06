import { NextRequest, NextResponse } from "next/server";
import { initDB } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme";

  if (authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initDB();
    return NextResponse.json({ success: true, message: "Database initialized" });
  } catch (err) {
    console.error("DB init error:", err);
    return NextResponse.json({ error: "Failed to initialize database" }, { status: 500 });
  }
}
