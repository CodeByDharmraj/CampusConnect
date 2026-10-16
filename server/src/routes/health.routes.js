import { Router } from "express";
import { getDatabaseStatus } from "../config/database.js";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "CampusConnect API",
      timestamp: new Date().toISOString(),
    },
  });
});

router.get("/db", (req, res) => {
  const database = getDatabaseStatus();
  const connected = database === "connected";

  res.status(connected ? 200 : 503).json({
    success: connected,
    data: {
      status: connected ? "ok" : "unavailable",
      database,
    },
  });
});

export default router;
