import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { COOKIE_NAME, COOKIE_OPTIONS, getJwtSecret } from "../config/auth.js";

export async function authenticate(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  let payload;

  try {
    payload = jwt.verify(token, getJwtSecret(), {
      issuer: "campusconnect-api",
      audience: "campusconnect-web",
      algorithms: ["HS256"],
    });
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);

      return res.status(401).json({
        success: false,
        message: "Your session is invalid or expired. Please sign in again.",
      });
    }

    return next(error);
  }

  try {
    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);

      return res.status(401).json({
        success: false,
        message: "Your account is unavailable. Please sign in again.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
