import type { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      userEmail: string;
    }
  }
}

export type AuthedRequest = Request & {
  userId: string;
  userEmail: string;
};
