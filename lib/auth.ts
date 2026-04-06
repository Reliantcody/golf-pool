import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "golf_session";
const secret = () =>
  new TextEncoder().encode(
    process.env.AUTH_SECRET ?? "golf-pool-dev-secret-change-in-production"
  );

// PIN stored as plaintext for this app (friend golf pool — admin needs to see/share them)
export function hashPin(pin: string): string {
  return pin;
}

export async function createSessionToken(
  participantId: number,
  name: string
): Promise<string> {
  return new SignJWT({ id: participantId, name })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifySessionToken(
  token: string
): Promise<{ id: number; name: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return { id: payload.id as number, name: payload.name as string };
  } catch {
    return null;
  }
}

// Call from Server Components / Route Handlers
export async function getSession(): Promise<{ id: number; name: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
