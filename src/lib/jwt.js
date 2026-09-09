import { SignJWT, jwtVerify } from "jose";
const COOKIE_NAME = "flixcasa_session";
const EXPIRY = "7d";
function getSecret() {
    const secret = process.env.JWT_SECRET || "flixcasa-jwt-secret-change-in-production-min32";
    return new TextEncoder().encode(secret);
}
export async function createSessionToken(payload) {
    return new SignJWT(Object.assign({}, payload))
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(EXPIRY)
        .sign(getSecret());
}
export async function verifySessionToken(token) {
    try {
        const { payload } = await jwtVerify(token, getSecret());
        return {
            accountId: payload.accountId,
            email: payload.email,
            isRootAdmin: payload.isRootAdmin,
        };
    }
    catch (_a) {
        return null;
    }
}
export { COOKIE_NAME };
