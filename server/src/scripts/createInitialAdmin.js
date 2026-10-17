import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import User from "../models/User.js";
import { connectDatabase } from "../config/database.js";

async function createInitialAdmin() {
  const name = process.env.BOOTSTRAP_ADMIN_NAME;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "Set BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD temporarily in backend/.env.",
    );
  }

  if (password.length < 12 || password.length > 128) {
    throw new Error("Bootstrap admin password must contain 12–128 characters.");
  }

  await connectDatabase();

  try {
    const existingAdmin = await User.exists({ role: "admin" });

    if (existingAdmin) {
      throw new Error("An administrator already exists. Bootstrap cancelled.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await User.create({
      name,
      email: email.trim().toLowerCase(),
      passwordHash,
      role: "admin",
      isActive: true,
    });

    console.log(`Initial administrator created: ${admin.email}`);
  } finally {
    await mongoose.disconnect();
  }
}

createInitialAdmin().catch((error) => {
  console.error("Bootstrap failed:", error.message);
  process.exitCode = 1;
});
