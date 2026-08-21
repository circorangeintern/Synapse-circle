import mongoose from "mongoose";
import { logger } from "./logger.js";

let connection = null;

export async function connectDB() {
  // Return existing connection if available
  if (connection && mongoose.connection.readyState === 1) {
    return connection;
  }

  try {
    // Configure connection for Render
    const options = {
      maxPoolSize: 10,
      minPoolSize: 5, // Keep connections alive
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      family: 4,
    };

    // Only reconnect if disconnected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI, options);
      connection = mongoose.connection;
      logger.info("MongoDB connected successfully");
    } else {
      connection = mongoose.connection;
    }

    return connection;
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    throw error;
  }
}

// Ping to keep connection alive
export async function pingDB() {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}
