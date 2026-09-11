import type { NextFunction, Request, Response } from "express";

import {
  getSession,
  getSessionCookieName,
} from "../lib/auth.js";

export interface AuthenticatedRequest extends Request {
  userId: number;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessionId = req.cookies?.[getSessionCookieName()];

    if (!sessionId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const session = await getSession(sessionId);

    if (!session) {
      res.clearCookie(getSessionCookieName(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      res.status(401).json({
        success: false,
        message: "Session expired or invalid",
      });
      return;
    }

    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.userId = session.userId;

    next();
  } catch (error) {
    next(error);
  }
}