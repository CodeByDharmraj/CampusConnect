import "dotenv/config";
import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { getJwtSecret } from "./config/auth.js";

const PORT = Number(process.env.PORT) || 5000;

let server;
let shuttingDown = false;

async function startServer() {
    try {
        getJwtSecret();
        await connectDatabase();

    server = app.listen(PORT, () => {
      console.log(`CampusConnect API running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });

    server.on("error", (error) => {
      console.error("HTTP server error:", error.message);
      process.exitCode = 1;
    });
  } catch (error) {
    console.error("Failed to start CampusConnect:", error.message);
    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received. Closing server...`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    await disconnectDatabase();
    console.log("CampusConnect shut down successfully.");
  } catch (error) {
    console.error("Shutdown failed:", error.message);
    process.exitCode = 1;
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await startServer();
