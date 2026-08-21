// scripts/migrate-google-users.js
import User from "../models/User.js";

async function migrateGoogleUsers() {
  // Find users who signed up with Google but didn't have googleId
  const users = await User.find({
    authProvider: "google",
    googleId: { $exists: false },
  });

  for (const user of users) {
    // You'd need to get googleId from the Google token
    // Or just set a placeholder
    user.googleId = user.email; // Not ideal but temporary
    await user.save();
    console.log(`✅ Migrated user: ${user.email}`);
  }
}
