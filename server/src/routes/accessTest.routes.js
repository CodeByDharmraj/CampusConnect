import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";

const router = Router();

router.get("/student", authenticate, authorizeRoles("student"), (req, res) => {
  res.json({
    success: true,
    message: "Student access granted.",
  });
});

router.get("/faculty", authenticate, authorizeRoles("faculty"), (req, res) => {
  res.json({
    success: true,
    message: "Faculty access granted.",
  });
});

router.get("/admin", authenticate, authorizeRoles("admin"), (req, res) => {
  res.json({
    success: true,
    message: "Admin access granted.",
  });
});

export default router;
