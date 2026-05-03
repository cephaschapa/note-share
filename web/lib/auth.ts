export type TokenPayload = {
  userId: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  iat: number;
  exp: number;
};

/** Decodes the stored JWT payload without verifying the signature. Safe for UI-only checks — the backend enforces real auth. */
export function getTokenPayload(): TokenPayload | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("note_share_token");
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as TokenPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(payload: TokenPayload): boolean {
  return Date.now() / 1000 > payload.exp;
}
