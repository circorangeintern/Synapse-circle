import request from "supertest";
import app from "../../server.js";
import User from "../../src/models/User.js";
import { getAuthToken } from "../helpers/authHelper.js";
import TrustedContact from "../../src/models/TrustedContact.js";
import SOSAlert from "../../src/models/SOSAlert.js";
import CampusSecurity from "../../src/models/CampusSecurity.js";
import config from "../../src/utils/config.js";

describe("SOS Alert API Tests", () => {
  let authData;
  let userId;
  let alertId;

  const testUser = {
    email: "sostest@campus.edu",
    name: "SOS Test User",
    password: "TestPassword123",
  };

  const testContact = {
    name: "Emergency Contact",
    email: "emergency@example.com",
    relationship: "friend",
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
      .send(testContact);

    const securityExists = await CampusSecurity.findOne();
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

  describe("POST /api/sos/trigger", () => {
    it("should trigger an SOS alert with location", async () => {
      const locationData = {
        latitude: 37.7749,
        longitude: -122.4194,
        locationAvailable: true,
        locationLabel: "Student Union Building",
      };

      const response = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send(locationData)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("alertId");
      expect(response.body).toHaveProperty("status", "sent");
      expect(response.body).toHaveProperty("message");
      expect(typeof response.body.message).toBe("string");
      expect(response.body).toHaveProperty("contactsNotified");
      expect(Array.isArray(response.body.contactsNotified)).toBe(true);
      expect(response.body.contactsNotified.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty("deliveredCount");
      expect(response.body).toHaveProperty("totalCount");
      expect(response.body).toHaveProperty("responseTimeline");
      expect(Array.isArray(response.body.responseTimeline)).toBe(true);

      // Check response timeline events
      const timelineEvents = response.body.responseTimeline.map((e) => e.event);
      expect(timelineEvents).toContain("SOS Triggered");
      expect(timelineEvents).toContain("Trusted Contacts Notified");
      expect(timelineEvents).toContain("Campus Security Notified");
      expect(timelineEvents).toContain("Location Tracking Started");

      // Check contacts have status field
      response.body.contactsNotified.forEach((contact) => {
        expect(contact).toHaveProperty("status");
        expect(["sent", "failed"]).toContain(contact.status);
        expect(contact).toHaveProperty("relationship");
      });

      alertId = response.body.alertId;

      const alert = await SOSAlert.findById(alertId);
      expect(alert).toBeTruthy();
      expect(alert.userId.toString()).toBe(userId);
      expect(alert.latitude).toBe(locationData.latitude);
      expect(alert.longitude).toBe(locationData.longitude);
      expect(alert.status).toBe("sent");
      expect(alert.locationLabel).toBe("Student Union Building");
      expect(alert).toHaveProperty("universityName");
      expect(alert).toHaveProperty("message");

      const timelineEventsDb = alert.timeline.map((e) => e.event);
      expect(timelineEventsDb).toContain("sos_activated");
      expect(timelineEventsDb).toContain("trusted_contacts_notified");
      expect(timelineEventsDb).toContain("security_dispatched");
      expect(timelineEventsDb).toContain("location_tracking_started");
    });

    it("should trigger SOS without location", async () => {
      const response = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
          locationAvailable: false,
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("alertId");
      expect(response.body).toHaveProperty("status", "sent");
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("responseTimeline");
    });

    it("should return 401 without token", async () => {
      const response = await request(app)
        .post("/api/sos/trigger")
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
        })
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty(
        "message",
        "Authentication required. Please log in.",
      );
    });

    it("should return 429 for too many SOS triggers", async () => {
      const originalDisable = process.env.DISABLE_RATE_LIMITING;
      const originalConfigDisable = config.disableRateLimiting;

      try {
        process.env.DISABLE_RATE_LIMITING = "false";
        config.disableRateLimiting = false;
        await new Promise((resolve) => setTimeout(resolve, 100));

        for (let i = 0; i < 3; i++) {
          await request(app)
            .post("/api/sos/trigger")
            .set("Authorization", `Bearer ${authData.accessToken}`)
            .send({
              latitude: 37.7749,
              longitude: -122.4194,
            });
        }

        const response = await request(app)
          .post("/api/sos/trigger")
          .set("Authorization", `Bearer ${authData.accessToken}`)
          .send({
            latitude: 37.7749,
            longitude: -122.4194,
          });

        expect(response.status).toBe(429);
        expect(response.body).toHaveProperty(
          "message",
          "Too many SOS triggers. Please wait before sending another alert.",
        );
      } catch (error) {
        if (error.status === 429) {
          expect(error.status).toBe(429);
        } else {
          throw error;
        }
      } finally {
        process.env.DISABLE_RATE_LIMITING = originalDisable;
        config.disableRateLimiting = originalConfigDisable;
      }
    });
  });

  describe("POST /api/sos/cancel/:alertId", () => {
    it("should cancel with reason false_alarm and mark status as false_alarm", async () => {
      const triggerResponse = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
        })
        .expect(200);

      const newAlertId = triggerResponse.body.alertId;

      const response = await request(app)
        .post(`/api/sos/cancel/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          reason: "false_alarm",
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("alertId", newAlertId);
      expect(response.body).toHaveProperty("status", "false_alarm");
      expect(response.body).toHaveProperty(
        "message",
        "Alert cancelled successfully",
      );

      const alert = await SOSAlert.findById(newAlertId);
      expect(alert.status).toBe("false_alarm");
      expect(alert.cancellationReason).toBe("false_alarm");
      expect(alert.resolvedBy).toBe("user");
      expect(alert.resolvedAt).toBeTruthy();
    });

    it("should cancel with a non-false_alarm reason and mark status as cancelled", async () => {
      const triggerResponse = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
        })
        .expect(200);

      const newAlertId = triggerResponse.body.alertId;

      const response = await request(app)
        .post(`/api/sos/cancel/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          reason: "user_error",
        })
        .expect(200);

      expect(response.body).toHaveProperty("status", "cancelled");

      const alert = await SOSAlert.findById(newAlertId);
      expect(alert.status).toBe("cancelled");
      expect(alert.cancellationReason).toBe("user_error");
    });

    it("should return 404 for non-existent alert", async () => {
      const response = await request(app)
        .post("/api/sos/cancel/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          reason: "false_alarm",
        })
        .expect(404);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Alert not found");
    });

    it("should return 400 when cancelling an already-cancelled alert", async () => {
      const triggerResponse = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ latitude: 37.7749, longitude: -122.4194 })
        .expect(200);

      const newAlertId = triggerResponse.body.alertId;

      await request(app)
        .post(`/api/sos/cancel/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ reason: "false_alarm" })
        .expect(200);

      const response = await request(app)
        .post(`/api/sos/cancel/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ reason: "false_alarm" })
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body.message).toContain("Alert cannot be cancelled");
    });

    it('should cancel with reason "resolved" and mark status as resolved', async () => {
      const triggerResponse = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
        })
        .expect(200);

      const newAlertId = triggerResponse.body.alertId;

      const response = await request(app)
        .post(`/api/sos/cancel/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          reason: "resolved",
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("alertId", newAlertId);
      expect(response.body).toHaveProperty("status", "resolved");
      expect(response.body).toHaveProperty(
        "message",
        "Alert cancelled successfully",
      );

      const alert = await SOSAlert.findById(newAlertId);
      expect(alert.status).toBe("resolved");
      expect(alert.cancellationReason).toBe("resolved");
      expect(alert.resolvedBy).toBe("user");
      expect(alert.resolvedAt).toBeTruthy();
    });

    it("should reject invalid cancellation reason (not in enum)", async () => {
      const triggerResponse = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
        })
        .expect(200);

      const newAlertId = triggerResponse.body.alertId;

      const response = await request(app)
        .post(`/api/sos/cancel/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          reason: "invalid_reason",
        })
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty(
        "message",
        "Invalid cancellation reason",
      );
    });
  });

  describe("POST /api/sos/resolve/:alertId", () => {
    it("should resolve an SOS alert with default resolvedBy", async () => {
      const triggerResponse = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ latitude: 37.7749, longitude: -122.4194 })
        .expect(200);

      const newAlertId = triggerResponse.body.alertId;

      const response = await request(app)
        .post(`/api/sos/resolve/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("alertId", newAlertId);
      expect(response.body).toHaveProperty("status", "resolved");
      expect(response.body).toHaveProperty(
        "message",
        "Alert resolved successfully",
      );

      const alert = await SOSAlert.findById(newAlertId);
      expect(alert.status).toBe("resolved");
      expect(alert.resolvedBy).toBe("user");
      expect(alert.resolvedAt).toBeTruthy();
    });

    it("should resolve with an explicit resolvedBy and resolutionReason", async () => {
      const triggerResponse = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ latitude: 37.7749, longitude: -122.4194 })
        .expect(200);

      const newAlertId = triggerResponse.body.alertId;

      const response = await request(app)
        .post(`/api/sos/resolve/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          resolvedBy: "campus_security",
          resolutionReason: "Security responded on scene, student was safe.",
        })
        .expect(200);

      expect(response.body).toHaveProperty("status", "resolved");

      const alert = await SOSAlert.findById(newAlertId);
      expect(alert.resolvedBy).toBe("campus_security");
      expect(alert.resolutionReason).toBe(
        "Security responded on scene, student was safe.",
      );
    });

    it("should return 404 for non-existent alert", async () => {
      const response = await request(app)
        .post("/api/sos/resolve/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({})
        .expect(404);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Alert not found");
    });

    it("should return 400 when resolving an already-resolved alert", async () => {
      const triggerResponse = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ latitude: 37.7749, longitude: -122.4194 })
        .expect(200);

      const newAlertId = triggerResponse.body.alertId;

      await request(app)
        .post(`/api/sos/resolve/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({})
        .expect(200);

      const response = await request(app)
        .post(`/api/sos/resolve/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body.message).toContain("Alert cannot be resolved");
    });

    it("should reject an invalid resolvedBy value", async () => {
      const triggerResponse = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ latitude: 37.7749, longitude: -122.4194 })
        .expect(200);

      const newAlertId = triggerResponse.body.alertId;

      const response = await request(app)
        .post(`/api/sos/resolve/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ resolvedBy: "not_a_real_role" })
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
    });

    it("should allow resolving after the 5-minute cancellation window (unlike cancel)", async () => {
      const originalWindow = config.cancellationWindowMinutes;

      try {
        config.cancellationWindowMinutes = 0;

        const triggerResponse = await request(app)
          .post("/api/sos/trigger")
          .set("Authorization", `Bearer ${authData.accessToken}`)
          .send({ latitude: 37.7749, longitude: -122.4194 })
          .expect(200);

        const newAlertId = triggerResponse.body.alertId;

        const cancelAttempt = await request(app)
          .post(`/api/sos/cancel/${newAlertId}`)
          .set("Authorization", `Bearer ${authData.accessToken}`)
          .send({ reason: "false_alarm" })
          .expect(400);

        expect(cancelAttempt.body.message).toContain(
          "Cancellation window has passed",
        );

        const resolveAttempt = await request(app)
          .post(`/api/sos/resolve/${newAlertId}`)
          .set("Authorization", `Bearer ${authData.accessToken}`)
          .send({ resolvedBy: "campus_security" })
          .expect(200);

        expect(resolveAttempt.body).toHaveProperty("status", "resolved");
      } finally {
        config.cancellationWindowMinutes = originalWindow;
      }
    });
  });

  describe("GET /api/sos/history", () => {
    it("should get alert history", async () => {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post("/api/sos/trigger")
          .set("Authorization", `Bearer ${authData.accessToken}`)
          .send({
            latitude: 37.7749 + i * 0.001,
            longitude: -122.4194 + i * 0.001,
          });
      }

      const response = await request(app)
        .get("/api/sos/history")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("alerts");
      expect(Array.isArray(response.body.alerts)).toBe(true);
      expect(response.body.alerts.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty("total");
      expect(response.body).toHaveProperty("offset", 0);
      expect(response.body).toHaveProperty("limit", 20);

      response.body.alerts.forEach((alert) => {
        expect(alert).toHaveProperty("universityName");
        expect(alert).toHaveProperty("locationLabel");
        expect(alert).toHaveProperty("durationMs");
        expect(alert).toHaveProperty("message");
        expect(alert).toHaveProperty("responseTimeline");
        expect(Array.isArray(alert.responseTimeline)).toBe(true);
        expect(alert).toHaveProperty("recipients");
        expect(Array.isArray(alert.recipients)).toBe(true);

        alert.recipients.forEach((recipient) => {
          expect(recipient).toHaveProperty("status");
          expect(["sent", "failed"]).toContain(recipient.status);
          expect(recipient).toHaveProperty("relationship");
        });

        expect(alert).toHaveProperty("recipientStats");
        expect(alert.recipientStats).toHaveProperty("total");
        expect(alert.recipientStats).toHaveProperty("delivered");
        expect(alert.recipientStats).toHaveProperty("failed");
      });
    });

    it("should have durationMs as milliseconds", async () => {
      const response = await request(app)
        .get("/api/sos/history")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      response.body.alerts.forEach((alert) => {
        if (alert.resolvedAt || alert.cancelledAt) {
          expect(typeof alert.durationMs).toBe("number");
          expect(alert.durationMs).toBeGreaterThanOrEqual(0);
        } else {
          expect(alert.durationMs).toBeNull();
        }
      });
    });

    it("should filter history by status, treating false_alarm and cancelled as distinct", async () => {
      const falseAlarmTrigger = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ latitude: 37.7749, longitude: -122.4194 })
        .expect(200);
      await request(app)
        .post(`/api/sos/cancel/${falseAlarmTrigger.body.alertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ reason: "false_alarm" })
        .expect(200);

      const cancelledTrigger = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ latitude: 37.7749, longitude: -122.4194 })
        .expect(200);
      await request(app)
        .post(`/api/sos/cancel/${cancelledTrigger.body.alertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ reason: "user_error" })
        .expect(200);

      const falseAlarmRes = await request(app)
        .get("/api/sos/history?status=false_alarm")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);
      expect(
        falseAlarmRes.body.alerts.some(
          (a) => a.id === falseAlarmTrigger.body.alertId,
        ),
      ).toBe(true);
      expect(
        falseAlarmRes.body.alerts.every((a) => a.status === "false_alarm"),
      ).toBe(true);

      const cancelledRes = await request(app)
        .get("/api/sos/history?status=cancelled")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);
      expect(
        cancelledRes.body.alerts.some(
          (a) => a.id === cancelledTrigger.body.alertId,
        ),
      ).toBe(true);
      expect(
        cancelledRes.body.alerts.every((a) => a.status === "cancelled"),
      ).toBe(true);
    });

    it("should filter history by status", async () => {
      const response = await request(app)
        .get("/api/sos/history?status=sent")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(
        response.body.alerts.every((alert) => alert.status === "sent"),
      ).toBe(true);
    });

    it("should paginate history", async () => {
      const response = await request(app)
        .get("/api/sos/history?limit=2&offset=0")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.alerts.length).toBeLessThanOrEqual(2);
      expect(response.body).toHaveProperty("limit", 2);
      expect(response.body).toHaveProperty("offset", 0);
    });
  });

  describe("GET /api/sos/history/:alertId", () => {
    it("should get a specific active alert", async () => {
      const triggerResponse = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
          locationLabel: "Faculty of Science",
        })
        .expect(200);

      const newAlertId = triggerResponse.body.alertId;

      const response = await request(app)
        .get(`/api/sos/history/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("alert");

      const { alert } = response.body;
      expect(alert).toHaveProperty("id", newAlertId);
      expect(alert).toHaveProperty("status", "sent");
      expect(alert).toHaveProperty("timestamp");
      expect(alert).toHaveProperty("location");
      expect(alert).toHaveProperty("contactsNotified");
      expect(alert).toHaveProperty("canCancel");
      expect(alert).toHaveProperty("cancellationTimeRemaining");
      expect(alert).toHaveProperty("message");
      expect(typeof alert.message).toBe("string");
      expect(alert).toHaveProperty("durationMs");
      expect(alert.durationMs).toBeNull();

      expect(alert).toHaveProperty("universityName");
      expect(alert).toHaveProperty("locationLabel", "Faculty of Science");

      expect(Array.isArray(alert.responseTimeline)).toBe(true);
      expect(alert.responseTimeline.length).toBeGreaterThanOrEqual(4);
      const events = alert.responseTimeline.map((e) => e.event);
      expect(events).toContain("sos_activated");
      expect(events).toContain("trusted_contacts_notified");
      expect(events).toContain("security_dispatched");
      expect(events).toContain("location_tracking_started");
      alert.responseTimeline.forEach((event) => {
        expect(event).toHaveProperty("timestamp");
        expect(event).toHaveProperty("status");
      });

      expect(alert.durationMs).toBeNull();
      expect(alert.resolutionSummary).toBeNull();

      alert.contactsNotified.forEach((contact) => {
        expect(contact).toHaveProperty("name");
        expect(contact).toHaveProperty("type");
        expect(contact).toHaveProperty("delivered");
        expect(contact).toHaveProperty("emailStatus");
        expect(contact).toHaveProperty("status");
        expect(["sent", "failed"]).toContain(contact.status);
        expect(contact).toHaveProperty("relationship");
      });
    });

    it("should include a populated Resolution Summary once an alert is resolved", async () => {
      const triggerResponse = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({ latitude: 37.7749, longitude: -122.4194 })
        .expect(200);

      const newAlertId = triggerResponse.body.alertId;

      await request(app)
        .post(`/api/sos/resolve/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          resolvedBy: "campus_security",
          resolutionReason: "Situation handled on scene.",
        })
        .expect(200);

      const response = await request(app)
        .get(`/api/sos/history/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      const { alert } = response.body;
      expect(alert.status).toBe("resolved");
      expect(typeof alert.durationMs).toBe("number");
      expect(alert.resolutionSummary).toMatchObject({
        resolvedBy: "campus_security",
        resolutionReason: "Situation handled on scene.",
      });
      expect(alert.resolutionSummary).toHaveProperty("startTime");
      expect(alert.resolutionSummary).toHaveProperty("endTime");
      expect(alert.resolutionSummary).toHaveProperty("durationMs");

      const events = alert.responseTimeline.map((e) => e.event);
      expect(events).toContain("resolved");
    });

    it("should return 404 for non-existent alert", async () => {
      const response = await request(app)
        .get("/api/sos/history/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(404);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Alert not found");
    });
  });

  describe("GET /api/sos/status/:alertId", () => {
    it("should get alert status", async () => {
      const triggerResponse = await request(app)
        .post("/api/sos/trigger")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
        })
        .expect(200);

      const newAlertId = triggerResponse.body.alertId;

      const response = await request(app)
        .get(`/api/sos/status/${newAlertId}`)
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("status", "sent");
      expect(response.body).toHaveProperty("canCancel", true);
      expect(response.body).toHaveProperty("cancellationTimeRemaining");
      expect(response.body).toHaveProperty("createdAt");
      expect(response.body).toHaveProperty("updatedAt");
    });

    it("should return 404 for non-existent alert", async () => {
      const response = await request(app)
        .get("/api/sos/status/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(404);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Alert not found");
    });
  });
});
