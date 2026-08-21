import request from "supertest";
import app from "../../server.js";
import User from "../../src/models/User.js";
import SOSAlert from "../../src/models/SOSAlert.js";
import config from "../../src/utils/config.js";
import { getAuthToken } from "../helpers/authHelper.js";
import CampusSecurity from "../../src/models/CampusSecurity.js";

/**
 * These tests target one specific product question: what happens when a
 * user who triggered a real SOS is now safe and wants to end the alert?
 *
 * There is no single "I'm safe now" action in the API. A caller has to
 * choose between /cancel (only within the 5-min window, reason enum:
 * false_alarm | user_error | other) and /resolve (no time limit,
 * resolvedBy: user | campus_security | admin | system, free-text reason).
 *
 * This suite documents the behavior of both paths for that scenario and
 * flags where the semantics diverge from what "I'm safe now" should mean.
 */
describe("SOS: user reports they are now safe", () => {
  let authData;
  let userId;

  const testUser = {
    email: "safe-now@campus.edu",
    name: "Safe Now User",
    password: "TestPassword123",
  };

  beforeAll(async () => {
    authData = await getAuthToken(testUser);
    userId = authData.userId;

    await User.findByIdAndUpdate(userId, {
      university: {
        acronym: "TEST",
        name: "Test University",
      },
      selectedUniversity: "Test University",
    });

    await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${authData.accessToken}`)
      .send({
        name: "Emergency Contact",
        email: "contact@example.com",
        relationship: "friend",
      });

    const securityExists = await CampusSecurity.findOne({
      universityAcronym: "TEST",
    });
    if (!securityExists) {
      await CampusSecurity.create({
        name: "Test Security",
        phoneNumber: "+1234567899",
        email: "security@campus.edu",
        location: "Main Building",
        isActive: true,
        universityAcronym: "TEST",
      });
    }
  });

  async function trigger() {
    const res = await request(app)
      .post("/api/sos/trigger")
      .set("Authorization", `Bearer ${authData.accessToken}`)
      .send({ latitude: 37.7749, longitude: -122.4194 })
      .expect(200);
    return res.body.alertId;
  }

  describe("Path A: user cancels within the window claiming safety", () => {
    it("forces a real, resolved emergency into a false_alarm/cancelled bucket", async () => {
      const alertId = await trigger();

      // There's no "I'm safe now" reason. The closest fit in the enum is
      // "other" — using "false_alarm" would misrepresent a real trigger.
      const res = await request(app)
        .post(`/api/sos/cancel/${alertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ reason: "other" })
        .expect(200);

      expect(res.body.status).toBe("cancelled");

      const alert = await SOSAlert.findById(alertId);
      // This alert was a genuine SOS that the user resolved themselves,
      // but it now lives in history indistinguishable from a mistaken
      // trigger or a UI misfire — same "cancelled" status, same shape.
      expect(alert.status).toBe("cancelled");
      expect(alert.resolvedBy).toBe("user");
      expect(alert.cancellationReason).toBe("other");
      // No field anywhere records "the user says they are safe now" as
      // distinct from "the user says this was a mistake."
    });

    it("cannot represent 'I'm safe now' without mislabeling as false_alarm", async () => {
      const alertId = await trigger();

      const res = await request(app)
        .post(`/api/sos/cancel/${alertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ reason: "false_alarm" })
        .expect(200);

      // This passes today, but semantically: "false_alarm" should mean
      // the emergency was never real. Reusing it for "I was in danger,
      // now I'm safe" corrupts any downstream metric built on this field
      // (e.g. rate of genuine emergencies vs. accidental triggers).
      expect(res.body.status).toBe("false_alarm");
      const alert = await SOSAlert.findById(alertId);
      expect(alert.cancellationReason).toBe("false_alarm");
    });
  });

  describe("Path B: user resolves instead of cancelling", () => {
    it("lets the user self-resolve a real alert with no window limit and no verification", async () => {
      const originalWindow = config.cancellationWindowMinutes;
      try {
        // Simulate being well past the cancellation window.
        config.cancellationWindowMinutes = 0;
        const alertId = await trigger();

        // /cancel is correctly blocked past the window.
        await request(app)
          .post(`/api/sos/cancel/${alertId}`)
          .set("Authorization", `Bearer ${authData.accessToken}`)
          .send({ reason: "false_alarm" })
          .expect(400);

        // But /resolve has no such limit, and resolvedBy defaults to
        // "user" — the same person who triggered the alert can mark it
        // resolved at any time, with any resolutionReason, with nothing
        // distinguishing "I confirm I'm safe" from an attacker (or
        // anyone with the account's token) silencing a live emergency.
        const res = await request(app)
          .post(`/api/sos/resolve/${alertId}`)
          .set("Authorization", `Bearer ${authData.accessToken}`)
          .send({ resolvedBy: "user", resolutionReason: "I'm safe now" })
          .expect(200);

        expect(res.body.status).toBe("resolved");

        const alert = await SOSAlert.findById(alertId);
        expect(alert.resolvedBy).toBe("user");
        expect(alert.resolutionReason).toBe("I'm safe now");
      } finally {
        config.cancellationWindowMinutes = originalWindow;
      }
    });

    it("produces the more semantically honest status for a real, resolved emergency", async () => {
      const alertId = await trigger();

      const res = await request(app)
        .post(`/api/sos/resolve/${alertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ resolvedBy: "user", resolutionReason: "I'm safe now" })
        .expect(200);

      expect(res.body.status).toBe("resolved");

      const detail = await request(app)
        .get(`/api/sos/history/${alertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      // "resolved" + resolutionSummary correctly preserves that this was
      // a genuine trigger that concluded safely — unlike the /cancel
      // path, which has no way to say that.
      expect(detail.body.alert.resolutionSummary).toMatchObject({
        resolvedBy: "user",
        resolutionReason: "I'm safe now",
      });
    });
  });

  describe("Trust boundary: self-resolution vs. verified resolution", () => {
    it("does not distinguish a user's own safety claim from campus security confirming it", async () => {
      const alertId = await trigger();

      const res = await request(app)
        .post(`/api/sos/resolve/${alertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ resolvedBy: "campus_security" })
        .expect(200);
      expect(res.body.status).toBe("resolved");
      const alert = await SOSAlert.findById(alertId);
      expect(alert.resolvedBy).toBe("campus_security");
    });
  });
});
