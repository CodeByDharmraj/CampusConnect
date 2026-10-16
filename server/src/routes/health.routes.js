import { Router } from "express";

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

export default router;
