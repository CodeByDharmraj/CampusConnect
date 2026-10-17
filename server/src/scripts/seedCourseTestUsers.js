import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import User from "../models/User.js";
import { connectDatabase } from "../config/database.js";

async function seedTestUsers() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Test seeding is disabled in production.");
  }

  const password = process.env.TEST_ACCOUNT_PASSWORD;

  if (!password || password.length < 12 || password.length > 128) {
    throw new Error(
      "Set TEST_ACCOUNT_PASSWORD to a temporary password of 12–128 characters.",
    );
  }

  await connectDatabase();

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const accounts = [
      {
        name: "Test Faculty",
        email: "faculty.test@campusconnect.local",
        role: "faculty",
        department: "CSE",
      },
      {
        name: "Test Student",
        email: "student.test@campusconnect.local",
        role: "student",
        studentId: "TEST-STUDENT-001",
        department: "CSE",
        semester: 5,
      },
    ];

    for (const account of accounts) {
      const user = await User.findOneAndUpdate(
        { email: account.email },
        {
          $setOnInsert: {
            ...account,
            passwordHash,
            isActive: true,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        },
      );

      console.log(`${user.role}: ${user.email} | ID: ${user.id}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

seedTestUsers().catch((error) => {
  console.error("Test seeding failed:", error.message);
  process.exitCode = 1;
});
