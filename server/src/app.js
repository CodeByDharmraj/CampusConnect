import express from "express";
import cors from "cors";
import helmet from "helmet";

import healthRouter from "./routes/health.routes.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";
import accessTestRouter from "./routes/accessTest.routes.js";

import courseRouter from "./modules/courses/course.routes.js";


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


app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CampusConnect API is running.",
  });
});


app.use("/api/access-test", accessTestRouter);

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/courses", courseRouter);

// Keep these last.
app.use(notFound);
app.use(errorHandler);

export default app;
