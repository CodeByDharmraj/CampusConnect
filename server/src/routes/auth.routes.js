import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";

import User from "../models/User.js";
import { authenticate } from "../middleware/authenticate.js";
import { COOKIE_NAME, COOKIE_OPTIONS, getJwtSecret } from "../config/auth.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department ?? null,
    semester: user.semester ?? null,
  };
}

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const email = req.body?.email;
    const password = req.body?.password;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email and password.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+passwordHash");

    const passwordMatches = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !user.isActive || !passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign({ sub: user.id }, getJwtSecret(), {
      expiresIn: "1h",
      issuer: "campusconnect-api",
      audience: "campusconnect-web",
      algorithm: "HS256",
    });

    res.cookie(COOKIE_NAME, token, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      data: {
        user: safeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: safeUser(req.user),
    },
  });
});

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);

  res.status(200).json({
    success: true,
    message: "Signed out successfully.",
  });
});

export default router;
