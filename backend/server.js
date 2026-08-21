import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import mongoSanitize from "express-mongo-sanitize";
import { swaggerSpec } from "./src/config/swagger.js";
import authRoutes from "./src/routes/auth.routes.js";
import contactRoutes from "./src/routes/contacts.routes.js";
import universityRoutes from "./src/routes/university.routes.js";
import emergencyRoutes from "./src/routes/emergency.routes.js";
import sosRoutes from "./src/routes/sos.routes.js";
import profileRoutes from "./src/routes/profile.routes.js";
import { errorHandler } from "./src/middlewares/errorHandler.js";
import { globalLimiter } from "./src/middlewares/rateLimiter.js";
import { logger } from "./src/utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("trust proxy", 1);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info("MongoDB connected successfully");
    console.log("✅ MongoDB connected successfully");
    console.log(
      "🔎 DB:",
      mongoose.connection.name,
      "| host:",
      mongoose.connection.host,
    );
    return true;
  } catch (err) {
    logger.error("MongoDB connection error:", err);
    console.error("❌ MongoDB connection error:", err);
    return false;
  }
};

// CORS Configuration
const allowedOrigins = [
  "https://synapse-circle-zcrc.vercel.app ",
  "https://synap-circle.onrender.com",
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-Request-ID",
  ],
  exposedHeaders: ["X-Request-ID"],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`🔒 CORS: Allowed origins: ${allowedOrigins.join(", ")}`);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
  }),
);
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(mongoSanitize());
app.use(
  "/assets",
  express.static(path.join(__dirname, "public/assets"), {
    maxAge: "7d",
  }),
);

// Debug Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(
    `📨 ${req.method} ${req.path} | Origin: ${origin || "No origin"}`,
  );
  console.log(
    `🔑 Authorization header: ${req.headers.authorization ? "Present ✅" : "None ❌"}`,
  );
  next();
});

// SWAGGER DOCUMENTATION
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #ff4444 }
      .swagger-ui .info .title small { font-size: 12px }
    `,
    customSiteTitle: "SafeWalk Campus API Documentation",
  }),
);

app.use("/api", globalLimiter);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: API health check
 *     description: Returns the health status of the API server and database connection
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-07-20T19:34:50.000Z"
 *                 uptime:
 *                   type: number
 *                   example: 123.45
 *                 environment:
 *                   type: string
 *                   enum: [development, production, test]
 *                 mongodb:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: connected
 *                 services:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: configured
 *       503:
 *         description: Service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Database connection failed
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.get("/keepalive", (req, res) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Auto-ping itself every 5 minutes
if (process.env.NODE_ENV === "production") {
  const keepAlive = async () => {
    try {
      const url =
        process.env.RENDER_URL ||
        `http://localhost:${process.env.PORT || 5000}`;
      const response = await fetch(`${url}/health`);
      console.log(`✅ Keep-alive ping: ${response.status}`);
    } catch (error) {
      console.error(`❌ Keep-alive failed: ${error.message}`);
    }
  };

  // Ping every 4 minutes (Render free tier sleeps after 15 minutes)
  setInterval(keepAlive, 4 * 60 * 1000);
  // Ping on startup
  setTimeout(keepAlive, 10000);
}
// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/university", universityRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/sos", sosRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use(errorHandler);

let server;

// Start server
const startServer = async () => {
  try {
    const dbConnected = await connectDB();
    if (!dbConnected) {
      console.error("❌ Database connection failed. Exiting...");
      process.exit(1);
    }

    const PORT = process.env.PORT || 5000;
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      console.log(
        `📊 MongoDB Status: ${mongoose.connection.readyState === 1 ? "Connected ✅" : "Disconnected ❌"}`,
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection:", err);
  console.error("❌ Unhandled Rejection:", err);
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  console.error("❌ Uncaught Exception:", err);
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log(
      `🛑 ${signal} received again — shutdown already in progress, ignoring.`,
    );
    return;
  }
  isShuttingDown = true;

  console.log(`🛑 ${signal} received. Shutting down gracefully...`);
  logger.info(`${signal} received. Shutting down gracefully...`);

  const shutdownTimeout = setTimeout(() => {
    console.error("⏱️  Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
  shutdownTimeout.unref();

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      console.log("🔌 HTTP server closed.");
    }

    await mongoose.connection.close();
    console.log("📊 MongoDB connection closed.");

    clearTimeout(shutdownTimeout);
    process.exit(0);
  } catch (err) {
    logger.error("Error during shutdown:", err);
    console.error("❌ Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

if (process.env.NODE_ENV !== "test") {
  await startServer();
}

export default app;
