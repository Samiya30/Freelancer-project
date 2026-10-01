import type { NextFunction, Request, Response } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export function createRateLimiter({
  windowMs,
  maxRequests,
  message = "Too many requests. Please try again later.",
}: RateLimitOptions) {
  const requests = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    const existing = requests.get(key);

    if (!existing || existing.resetAt <= now) {
      requests.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });

      next();
      return;
    }

    existing.count += 1;

    if (existing.count > maxRequests) {
      const retryAfterSeconds = Math.ceil(
        (existing.resetAt - now) / 1000,
      );

      res.setHeader("Retry-After", retryAfterSeconds);

      res.status(429).json({
        success: false,
        message,
        retryAfterSeconds,
      });

      return;
    }

    next();
  };
}