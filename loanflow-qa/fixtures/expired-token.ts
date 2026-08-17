import jwt from "jsonwebtoken";
import { qaUser } from "./test-users";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-change-me";

export function expiredAccessToken(): string {
  return jwt.sign(
    {
      sub: "expired-user",
      email: qaUser.email,
      exp: Math.floor(Date.now() / 1000) - 60,
    },
    JWT_SECRET,
  );
}
