import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "flixcasa_session";
const EXPIRY = "7d";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "flixcasa-jwt-secret-change-in-production-min32";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  accountId: string;
  email: string;
  name?: string;
  picture?: string;
  isRootAdmin: boolean;
}

export async function createSessionToken(payload: SessionPayload, expiry: string = EXPIRY): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      accountId: payload.accountId as string,
      email: payload.email as string,
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
      isRootAdmin: payload.isRootAdmin as boolean,
    };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
