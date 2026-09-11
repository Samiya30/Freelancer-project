import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

import { prisma } from "./prisma.js";

const SESSION_COOKIE = "freelanceos_session";
const SESSION_DURATION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(userId: number) {
  const id = nanoid(32);

  const expiresAt = new Date();
  expiresAt.setDate(
    expiresAt.getDate() + SESSION_DURATION_DAYS,
  );

  const session = await prisma.session.create({
    data: {
      id,
      userId,
      expiresAt,
    },
  });

  return session;
}

export async function getSession(sessionId: string) {
  if (!sessionId) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      id: sessionId,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  return session;
}

export async function deleteSession(sessionId: string) {
  if (!sessionId) {
    return;
  }

  await prisma.session.deleteMany({
    where: {
      id: sessionId,
    },
  });
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  };
}