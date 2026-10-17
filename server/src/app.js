import express from "express";
import cors from "cors";
import helmet from "helmet";

import healthRouter from "./routes/health.routes.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json({ limit: "100kb" }));
app.use("/api/auth", authRouter);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CampusConnect API is running.",
  });
});

app.use("/api/health", healthRouter);

// Register future API routers above the 404 handler.
app.use(notFound);

// Error-handling middleware must be last.
app.use(errorHandler);

export default app;
