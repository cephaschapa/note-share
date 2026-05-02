import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

export type JWTPayload = {
  userId: string;
  email: string;
  role: string;
};

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET as string) as JWTPayload;
  } catch (error) {
    throw new Error("Invalid token");
  }
}
