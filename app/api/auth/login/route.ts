import { NextRequest, NextResponse } from "next/server";
import {
  findParticipantByName,
  verifyParticipantPin,
  registerParticipant,
} from "@/lib/db";
import {
  hashPin,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/auth";
import { MAJORS } from "@/lib/majors";

export async function POST(req: NextRequest) {
  try {
    const { name, pin, isRegister } = await req.json() as {
      name: string;
      pin: string;
      isRegister?: boolean;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!pin || !/^\d{4,6}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be 4–6 digits" },
        { status: 400 }
      );
    }

    const pinHash = hashPin(pin);

    if (isRegister) {
      // Registration: pool must still be open to new entrants
      const firstDeadline = new Date(MAJORS[0].submissionDeadline);
      const existing = await findParticipantByName(name);

      if (existing?.hasPin) {
        return NextResponse.json(
          { error: "This name is already registered. Please log in instead." },
          { status: 400 }
        );
      }

      if (!existing && new Date() >= firstDeadline) {
        return NextResponse.json(
          { error: "The pool is closed to new participants after The Masters." },
          { status: 400 }
        );
      }

      const participant = await registerParticipant(name.trim(), pinHash);
      const token = await createSessionToken(participant.id, participant.name);

      const res = NextResponse.json({ success: true, name: participant.name });
      res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
      });
      return res;
    } else {
      // Login
      const participant = await verifyParticipantPin(name.trim(), pinHash);
      if (!participant) {
        return NextResponse.json(
          { error: "Incorrect name or PIN." },
          { status: 401 }
        );
      }

      const token = await createSessionToken(participant.id, participant.name);
      const res = NextResponse.json({ success: true, name: participant.name });
      res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
      });
      return res;
    }
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
