import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import {
  createSession,
  deleteSession,
  getSession,
  getSessionCookieName,
  getSessionCookieOptions,
  hashPassword,
  verifyPassword,
} from "../lib/auth.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

function sanitizeUser(user: {
  id: number;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  bio: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    bio: user.bio,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      firstName = "",
      lastName = "",
      phone = "",
    } = req.body as {
      name?: unknown;
      email?: unknown;
      password?: unknown;
      firstName?: unknown;
      lastName?: unknown;
      phone?: unknown;
    };

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    if (!normalizedName) {
      res.status(400).json({
        success: false,
        message: "Name is required",
      });
      return;
    }

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      res.status(400).json({
        success: false,
        message: "A valid email address is required",
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
      return;
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        password: passwordHash,
        firstName: typeof firstName === "string" ? firstName.trim() : "",
        lastName: typeof lastName === "string" ? lastName.trim() : "",
        phone: typeof phone === "string" ? phone.trim() : "",
      },
    });

    const session = await createSession(user.id);

    res.cookie(
      getSessionCookieName(),
      session.id,
      getSessionCookieOptions(),
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body as {
      email?: unknown;
      password?: unknown;
    };

    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user || !user.password) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    const passwordValid = await verifyPassword(
      password,
      user.password,
    );

    if (!passwordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    const session = await createSession(user.id);

    res.cookie(
      getSessionCookieName(),
      session.id,
      getSessionCookieOptions(),
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;

    const user = await prisma.user.findUnique({
      where: {
        id: authenticatedReq.userId,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User account not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const sessionId = req.cookies?.[getSessionCookieName()];

    if (sessionId) {
      await deleteSession(sessionId);
    }

    res.clearCookie(getSessionCookieName(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;