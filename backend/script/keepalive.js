// keepalive.js
import axios from "axios";

const URL = process.env.RENDER_URL || "https://synap-circle.onrender.com";

async function keepAlive() {
  try {
    const start = Date.now();
    const response = await axios.get(`${URL}/health`, {
      timeout: 5000,
      headers: {
        "User-Agent": "keepalive-script",
      },
    });
    const duration = Date.now() - start;

    console.log(
      `✅ Keep-alive: ${response.status} - ${duration}ms - ${new Date().toISOString()}`,
    );

    // If response is not 200, log warning
    if (response.status !== 200) {
      console.warn(`⚠️ Unhealthy response: ${response.status}`);
    }
  } catch (error) {
    console.error(
      `❌ Keep-alive failed: ${error.message} - ${new Date().toISOString()}`,
    );
  }
}

// Ping every 4 minutes (Render free tier sleeps after 15 min inactivity)
setInterval(keepAlive, 4 * 60 * 1000);

// Also ping on start
keepAlive().catch(console.error);

console.log(`🔄 Keep-alive started for ${URL}`);
console.log(`⏰ Will ping every 4 minutes`);
