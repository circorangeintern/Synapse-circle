import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function dropDatabase() {
  // 🔴 CRITICAL SAFETY CHECK
  if (process.env.NODE_ENV === "production") {
    console.error("❌ CANNOT DROP DATABASE IN PRODUCTION!");
    process.exit(1);
  }

  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/sos_db";
    console.log(`📦 Connecting to: ${uri}`);

    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    // Get database name
    const dbName = mongoose.connection.name;
    console.log(`📊 Database: ${dbName}`);

    // Show collections before dropping
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log("\n📋 Collections that will be deleted:");
    collections.forEach((col) => console.log(`  - ${col.name}`));
    console.log(`\nTotal: ${collections.length} collections`);

    // Ask for confirmation
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question('\n⚠️  Type "DROP" to confirm: ', resolve);
    });

    rl.close();

    if (answer !== "DROP") {
      console.log("❌ Drop cancelled");
      process.exit(0);
    }

    // Drop the database
    await mongoose.connection.dropDatabase();
    console.log(`✅ Database "${dbName}" dropped successfully!`);
  } catch (error) {
    console.error("❌ Failed to drop database:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

await dropDatabase();
