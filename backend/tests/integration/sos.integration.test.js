import request from "supertest";
import app from "../../server.js";
import User from "../../src/models/User.js";
import SOSAlert from "../../src/models/SOSAlert.js";
import config from "../../src/utils/config.js";
import TrustedContact from "../../src/models/TrustedContact.js";
import CampusSecurity from "../../src/models/CampusSecurity.js";
import { getAuthToken } from "../helpers/authHelper.js";

describe("SOS Alert Integration Tests", () => {
  let authData;
  let userId;
  let alertId;

  const testUser = {
    email: "integration-sos@campus.edu",
    name: "Integration SOS User",
    password: "TestPassword123",
  };

  beforeAll(async () => {
    authData = await getAuthToken(testUser);
    userId = authData.userId;

    // Set up user's university
    await User.findByIdAndUpdate(userId, {
      university: {
        acronym: "UI",
        name: "University of Ibadan",
      },
      selectedUniversity: "University of Ibadan",
    });

    // Create UI-specific campus security
    await CampusSecurity.findOneAndUpdate(
      { universityAcronym: "UI" },
      {
        name: "UI Campus Security",
        phoneNumber: "+234123456789",
        email: "security@ui.edu.ng",
        location: "Main Campus, UI",
        universityAcronym: "UI",
        isActive: true,
      },
      { upsert: true },
    );

    // Create UNILAG security (should NOT be used for UI users)
    await CampusSecurity.findOneAndUpdate(
      { universityAcronym: "UNILAG" },
      {
        name: "UNILAG Security",
        phoneNumber: "+234987654321",
        email: "security@unilag.edu.ng",
        location: "Main Campus, UNILAG",
        universityAcronym: "UNILAG",
        isActive: true,
      },
      { upsert: true },
    );

    // Add a trusted contact
    await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${authData.accessToken}`)
      .send({
        name: "SOS Contact",
        email: "soscontact@example.com",
        relationship: "friend",
      })
      .expect(201);
  });

  // Add a test specifically for university-specific security
  describe("University-specific SOS", () => {
    it("should only send SOS to user's university security", async () => {
      const locationData = {
        latitude: 37.7749,
        longitude: -122.4194,
        locationAvailable: true,
        locationLabel: "UI Main Library",
      };

      const res = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send(locationData)
        .expect(200);

      // Check that ONLY UI security was notified
      const uiSecurityNotified = res.body.contactsNotified.some(
        (c) => c.name === "UI Campus Security",
      );
      const unilagSecurityNotified = res.body.contactsNotified.some(
        (c) => c.name === "UNILAG Security",
      );

      expect(uiSecurityNotified).toBe(true);
      expect(unilagSecurityNotified).toBe(false);
    });

    it("should log warning when no security exists for user's university", async () => {
      // Create a user with a university that has no security
      const newUser = {
        email: "nul@campus.edu",
        name: "No University Login",
        password: "TestPassword123",
      };

      const newAuthData = await getAuthToken(newUser);

      // Set university with no security
      await User.findByIdAndUpdate(newAuthData.userId, {
        university: {
          acronym: "NUL",
          name: "Non-existent University",
        },
      });

      // Add a trusted contact
      await request(app)
        .post("/api/contacts")
        .set("Authorization", `Bearer ${newAuthData.accessToken}`)
        .send({
          name: "Test Contact",
          email: "test@example.com",
          relationship: "friend",
        })
        .expect(201);

      const res = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${newAuthData.accessToken}`)
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
        })
        .expect(200);

      // Should still work with trusted contacts
      expect(res.body).toHaveProperty("success", true);
      expect(
        res.body.contactsNotified.some((c) => c.type === "trusted_contact"),
      ).toBe(true);
      // No campus security should be notified
      expect(
        res.body.contactsNotified.some((c) => c.type === "campus_security"),
      ).toBe(false);
    });
  });

  describe("Complete SOS Flow", () => {
    it("should trigger an SOS alert", async () => {
      const locationData = {
        latitude: 37.7749,
        longitude: -122.4194,
        locationAvailable: true,
        locationLabel: "Main Library",
      };

      const res = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send(locationData)
        .expect(200);

      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("alertId");
      expect(res.body).toHaveProperty("status", "sent");
      expect(res.body).toHaveProperty("message");
      expect(res.body).toHaveProperty("contactsNotified");
      expect(res.body.contactsNotified).toBeInstanceOf(Array);
      expect(res.body.contactsNotified.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty("deliveredCount");
      expect(res.body).toHaveProperty("totalCount");
      expect(res.body).toHaveProperty("responseTimeline");
      expect(res.body.responseTimeline).toBeInstanceOf(Array);

      // Check response timeline
      const timelineEvents = res.body.responseTimeline.map((e) => e.event);
      expect(timelineEvents).toContain("SOS Triggered");
      expect(timelineEvents).toContain("Trusted Contacts Notified");
      expect(timelineEvents).toContain("Campus Security Notified");
      expect(timelineEvents).toContain("Location Tracking Started");

      // Check contacts have status
      res.body.contactsNotified.forEach((contact) => {
        expect(contact).toHaveProperty("status");
        expect(["sent", "failed"]).toContain(contact.status);
        expect(contact).toHaveProperty("relationship");
      });

      alertId = res.body.alertId;

      const alert = await SOSAlert.findById(alertId);
      expect(alert).toBeTruthy();
      expect(alert.userId.toString()).toBe(userId);
      expect(alert.status).toBe("sent");
      expect(alert.latitude).toBe(locationData.latitude);
      expect(alert.longitude).toBe(locationData.longitude);
      expect(alert.locationLabel).toBe("Main Library");
      expect(alert).toHaveProperty("message");

      const timelineEventsDb = alert.timeline.map((e) => e.event);
      expect(timelineEventsDb).toContain("sos_activated");
      expect(timelineEventsDb).toContain("trusted_contacts_notified");
      expect(timelineEventsDb).toContain("security_dispatched");
      expect(timelineEventsDb).toContain("location_tracking_started");
    });

    it("should get alert status", async () => {
      const res = await request(app)
        .get(`/api/sos/status/${alertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("status", "sent");
      expect(res.body).toHaveProperty("canCancel", true);
      expect(res.body).toHaveProperty("cancellationTimeRemaining");
      expect(res.body).toHaveProperty("createdAt");
      expect(res.body).toHaveProperty("updatedAt");
    });

    it("should cancel an SOS alert", async () => {
      const res = await request(app)
        .post(`/api/sos/cancel/${alertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ reason: "false_alarm" })
        .expect(200);

      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("status", "false_alarm");
      expect(res.body).toHaveProperty("alertId", alertId);

      const alert = await SOSAlert.findById(alertId);
      expect(alert.status).toBe("false_alarm");
      expect(alert.cancellationReason).toBe("false_alarm");
      expect(alert.resolvedBy).toBe("user");
      expect(alert.resolvedAt).toBeTruthy();
    });

    it("should prevent cancelling already cancelled alert", async () => {
      const res = await request(app)
        .post(`/api/sos/cancel/${alertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ reason: "false_alarm" })
        .expect(400);

      expect(res.body).toHaveProperty("success", false);
      expect(res.body.message).toContain("Alert cannot be cancelled");
    });
    it("should cancel with reason 'resolved' and mark status as resolved", async () => {
      const triggerRes = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
        })
        .expect(200);

      const newAlertId = triggerRes.body.alertId;

      const res = await request(app)
        .post(`/api/sos/cancel/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ reason: "resolved" })
        .expect(200);

      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("status", "resolved");
      expect(res.body).toHaveProperty("alertId", newAlertId);

      const alert = await SOSAlert.findById(newAlertId);
      expect(alert.status).toBe("resolved");
      expect(alert.cancellationReason).toBe("resolved");
      expect(alert.resolvedBy).toBe("user");
      expect(alert.resolvedAt).toBeTruthy();
    });

    it("should reject invalid cancellation reason", async () => {
      const triggerRes = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
        })
        .expect(200);

      const newAlertId = triggerRes.body.alertId;

      const res = await request(app)
        .post(`/api/sos/cancel/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ reason: "invalid_reason" })
        .expect(400);

      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Invalid cancellation reason");
    });
  });

  describe("Resolve SOS Flow", () => {
    let resolveAlertId;

    it("should trigger a fresh alert to resolve", async () => {
      const res = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ latitude: 37.7749, longitude: -122.4194 })
        .expect(200);

      resolveAlertId = res.body.alertId;
      expect(res.body).toHaveProperty("status", "sent");
      expect(res.body).toHaveProperty("message");
      expect(res.body).toHaveProperty("responseTimeline");
    });

    it("should resolve the alert as campus security", async () => {
      const res = await request(app)
        .post(`/api/sos/resolve/${resolveAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          resolvedBy: "campus_security",
          resolutionReason: "Security responded, student confirmed safe.",
        })
        .expect(200);

      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("status", "resolved");
      expect(res.body).toHaveProperty("alertId", resolveAlertId);

      const alert = await SOSAlert.findById(resolveAlertId);
      expect(alert.status).toBe("resolved");
      expect(alert.resolvedBy).toBe("campus_security");
      expect(alert.resolutionReason).toBe(
        "Security responded, student confirmed safe.",
      );
      expect(alert.resolvedAt).toBeTruthy();
    });

    it("should reflect the resolution in the alert detail response", async () => {
      const res = await request(app)
        .get(`/api/sos/history/${resolveAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      const { alert } = res.body;
      expect(alert.status).toBe("resolved");
      expect(typeof alert.durationMs).toBe("number");
      expect(alert.resolutionSummary).toMatchObject({
        resolvedBy: "campus_security",
        resolutionReason: "Security responded, student confirmed safe.",
      });
      expect(alert.resolutionSummary).toHaveProperty("durationMs");

      const events = alert.responseTimeline.map((e) => e.event);
      expect(events).toEqual([
        "sos_activated",
        "trusted_contacts_notified",
        "security_dispatched",
        "location_tracking_started",
        "resolved",
      ]);
    });

    it("should prevent resolving an already-resolved alert", async () => {
      const res = await request(app)
        .post(`/api/sos/resolve/${resolveAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty("success", false);
      expect(res.body.message).toContain("Alert cannot be resolved");
    });

    it("should still allow resolving after the cancellation window has passed", async () => {
      const originalWindow = config.cancellationWindowMinutes;

      try {
        config.cancellationWindowMinutes = 0;

        const triggerRes = await request(app)
          .post("/api/sos/trigger")
          .set("Authorization", `Bearer ${authData.accessToken}`)
          .send({ latitude: 37.7749, longitude: -122.4194 })
          .expect(200);

        const lateAlertId = triggerRes.body.alertId;

        await request(app)
          .post(`/api/sos/cancel/${lateAlertId}`)
          .set("Authorization", `Bearer ${authData.accessToken}`)
          .send({ reason: "false_alarm" })
          .expect(400);

        const resolveRes = await request(app)
          .post(`/api/sos/resolve/${lateAlertId}`)
          .set("Authorization", `Bearer ${authData.accessToken}`)
          .send({ resolvedBy: "admin" })
          .expect(200);

        expect(resolveRes.body).toHaveProperty("status", "resolved");
      } finally {
        config.cancellationWindowMinutes = originalWindow;
      }
    });
  });

  describe("SOS History", () => {
    it("should get alert history", async () => {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post("/api/sos/trigger")
          .set("Authorization", `Bearer ${authData.accessToken}`)
          .send({
            latitude: 37.7749 + i * 0.001,
            longitude: -122.4194 + i * 0.001,
          })
          .expect(200);
      }

      const res = await request(app)
        .get("/api/sos/history")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("success", true);
      expect(res.body.alerts).toBeInstanceOf(Array);
      expect(res.body.alerts.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty("total");
      expect(res.body).toHaveProperty("limit", 20);
      expect(res.body).toHaveProperty("offset", 0);

      // Check new fields
      res.body.alerts.forEach((alert) => {
        expect(alert).toHaveProperty("durationMs");
        expect(alert).toHaveProperty("message");
        expect(alert).toHaveProperty("responseTimeline");
        expect(alert).toHaveProperty("recipients");
        expect(alert).toHaveProperty("recipientStats");

        alert.recipients.forEach((recipient) => {
          expect(recipient).toHaveProperty("status");
          expect(["sent", "failed"]).toContain(recipient.status);
        });
      });
    });

    it("should get specific alert", async () => {
      const res = await request(app)
        .get(`/api/sos/history/${alertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("success", true);
      expect(res.body.alert).toHaveProperty("id", alertId);
      expect(res.body.alert).toHaveProperty("status", "false_alarm");
      expect(res.body.alert).toHaveProperty("cancelledAt");
      expect(res.body.alert).toHaveProperty("message");
      expect(res.body.alert).toHaveProperty("universityName");
      expect(res.body.alert).toHaveProperty("locationLabel");
      expect(typeof res.body.alert.durationMs).toBe("number");
      expect(res.body.alert).toHaveProperty("responseTimeline");
      expect(res.body.alert).toHaveProperty("contactsNotified");

      res.body.alert.contactsNotified.forEach((contact) => {
        expect(contact).toHaveProperty("status");
        expect(["sent", "failed"]).toContain(contact.status);
      });

      expect(res.body.alert.resolutionSummary).toMatchObject({
        resolvedBy: "user",
        resolutionReason: "false_alarm",
      });
      expect(res.body.alert.resolutionSummary).toHaveProperty("durationMs");

      const events = res.body.alert.responseTimeline.map((e) => e.event);
      expect(events).toContain("sos_activated");
      expect(events).toContain("false_alarm");
    });

    it("should filter history by status", async () => {
      const res = await request(app)
        .get("/api/sos/history?status=sent")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("success", true);
      expect(res.body.alerts.every((alert) => alert.status === "sent")).toBe(
        true,
      );
    });

    it("should treat false_alarm and resolved as distinct, filterable statuses", async () => {
      const falseAlarmRes = await request(app)
        .get("/api/sos/history?status=false_alarm")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);
      expect(
        falseAlarmRes.body.alerts.every((a) => a.status === "false_alarm"),
      ).toBe(true);
      expect(falseAlarmRes.body.alerts.some((a) => a.id === alertId)).toBe(
        true,
      );

      const resolvedRes = await request(app)
        .get("/api/sos/history?status=resolved")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);
      expect(
        resolvedRes.body.alerts.every((a) => a.status === "resolved"),
      ).toBe(true);
      expect(resolvedRes.body.alerts.length).toBeGreaterThan(0);
    });

    it("should paginate history correctly", async () => {
      const res = await request(app)
        .get("/api/sos/history?limit=2&offset=0")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(res.body.alerts.length).toBeLessThanOrEqual(2);
      expect(res.body).toHaveProperty("limit", 2);
      expect(res.body).toHaveProperty("offset", 0);
    });
  });

  describe("SOS Rate Limiting", () => {
    it("should enforce SOS rate limiting", async () => {
      const originalDisable = process.env.DISABLE_RATE_LIMITING;
      const originalConfigDisable = config.disableRateLimiting;

      try {
        process.env.DISABLE_RATE_LIMITING = "false";
        config.disableRateLimiting = false;

        for (let i = 0; i < 4; i++) {
          await request(app)
            .post("/api/sos/trigger")
            .set("Authorization", `Bearer ${authData.accessToken}`)
            .send({
              latitude: 37.7749,
              longitude: -122.4194,
            });
        }

        const res = await request(app)
          .post("/api/sos/trigger")
          .set("Authorization", `Bearer ${authData.accessToken}`)
          .send({
            latitude: 37.7749,
            longitude: -122.4194,
          })
          .expect(429);

        expect(res.body).toHaveProperty(
          "message",
          "Too many SOS triggers. Please wait before sending another alert.",
        );
      } finally {
        process.env.DISABLE_RATE_LIMITING = originalDisable;
        config.disableRateLimiting = originalConfigDisable;
      }
    });
  });

  describe("SOS Error Handling", () => {
    it("should handle non-existent alert ID", async () => {
      const res = await request(app)
        .get("/api/sos/history/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(404);

      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Alert not found");
    });

    it("should handle unauthorized SOS trigger", async () => {
      const res = await request(app)
        .post("/api/sos/trigger")
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
        })
        .expect(401);

      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "Authentication required. Please log in.",
      );
    });
  });
});
