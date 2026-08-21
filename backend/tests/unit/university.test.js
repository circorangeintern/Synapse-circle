import request from "supertest";
import app from "../../server.js";
import User from "../../src/models/User.js";
import CampusSecurity from "../../src/models/CampusSecurity.js";
import { getAuthToken, clearAuthCache } from "../helpers/authHelper.js";

describe("University API Tests", () => {
  let authData;
  let userId;

  const testUser = {
    email: "universitytest@campus.edu",
    name: "University Test User",
    password: "TestPassword123",
  };

  const testUniversity = {
    name: "Test University",
    acronym: "TU",
    location: "Test City, Test Country",
  };

  beforeAll(async () => {
    authData = await getAuthToken(testUser);
    userId = authData.userId;
  });

  beforeEach(() => {
    clearAuthCache();
  });

  describe("POST /api/university", () => {
    beforeEach(async () => {
      await User.findByIdAndUpdate(userId, {
        $set: { university: null, selectedUniversity: null },
      });
    });

    it("should save university for authenticated user", async () => {
      const response = await request(app)
        .post("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send(testUniversity)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "University updated successfully. No security contacts found for this university.",
      );
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("university");
      expect(response.body.data.university).toHaveProperty(
        "name",
        testUniversity.name,
      );
      expect(response.body.data.university).toHaveProperty(
        "acronym",
        testUniversity.acronym.toUpperCase(),
      );
      expect(response.body.data.university).toHaveProperty(
        "location",
        testUniversity.location,
      );

      const user = await User.findById(userId);
      expect(user.university.name).toBe(testUniversity.name);
      expect(user.university.acronym).toBe(
        testUniversity.acronym.toUpperCase(),
      );
      expect(user.university.location).toBe(testUniversity.location);
    });

    it("should return 409 if university already exists for user", async () => {
      await request(app)
        .post("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send(testUniversity)
        .expect(200);

      const response = await request(app)
        .post("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          name: "Another University",
          acronym: "AU",
          location: "Another City",
        })
        .expect(409);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty(
        "message",
        "University already set for this user. Use PUT to update.",
      );
    });

    it("should update onboarding step to contacts when at university step", async () => {
      await User.findByIdAndUpdate(userId, {
        onboardingStep: "university",
        $set: { university: null, selectedUniversity: null },
      });

      const response = await request(app)
        .post("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          name: "Another University",
          acronym: "AU",
          location: "Another City",
        })
        .expect(200);

      expect(response.body.data).toHaveProperty("onboardingStep", "contacts");

      const user = await User.findById(userId);
      expect(user.onboardingStep).toBe("contacts");
    });

    it("should return 400 for missing name", async () => {
      const response = await request(app)
        .post("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({
          acronym: "TU",
          location: "Test City",
        })
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty(
        "message",
        "University name and acronym are required",
      );
    });

    it("should return 401 without token", async () => {
      const response = await request(app)
        .post("/api/university")
        .send(testUniversity)
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty(
        "message",
        "Authentication required. Please log in.",
      );
    });
  });

  describe("GET /api/university", () => {
    beforeEach(async () => {
      await User.findByIdAndUpdate(userId, {
        $set: { university: null, selectedUniversity: null },
      });
    });

    it("should get user's university", async () => {
      await request(app)
        .post("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send(testUniversity)
        .expect(200);

      const response = await request(app)
        .get("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("university");
      expect(response.body.data.university).toHaveProperty(
        "name",
        testUniversity.name,
      );
      expect(response.body.data.university).toHaveProperty(
        "acronym",
        testUniversity.acronym.toUpperCase(),
      );
    });

    it("should return null if user has no university", async () => {
      const newUser = {
        email: `no-university-${Date.now()}@campus.edu`,
        name: "No University User",
        password: "TestPassword123",
      };

      const newAuth = await getAuthToken(newUser);

      const response = await request(app)
        .get("/api/university")
        .set("Authorization", `Bearer ${newAuth.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data.university).toBeNull();
    });
  });

  describe("PUT /api/university", () => {
    beforeEach(async () => {
      await User.findByIdAndUpdate(userId, {
        $set: { university: null, selectedUniversity: null },
      });
      await request(app)
        .post("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send(testUniversity)
        .expect(200);
    });

    it("should update university name", async () => {
      const updateData = { name: "Updated University Name" };

      const response = await request(app)
        .put("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data.university).toHaveProperty(
        "name",
        updateData.name,
      );

      const user = await User.findById(userId);
      expect(user.university.name).toBe(updateData.name);
    });

    it("should update university acronym", async () => {
      const updateData = { acronym: "UTU" };

      const response = await request(app)
        .put("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.university).toHaveProperty(
        "acronym",
        updateData.acronym.toUpperCase(),
      );

      const user = await User.findById(userId);
      expect(user.university.acronym).toBe(updateData.acronym.toUpperCase());
    });

    it("should return 400 with empty update", async () => {
      const response = await request(app)
        .put("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty(
        "message",
        "At least one field (name, acronym, or location) is required",
      );
    });
  });

  describe("DELETE /api/university", () => {
    beforeEach(async () => {
      await User.findByIdAndUpdate(userId, {
        $set: { university: null, selectedUniversity: null },
      });
      await request(app)
        .post("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send(testUniversity)
        .expect(200);
    });

    it("should remove user's university", async () => {
      const response = await request(app)
        .delete("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "University removed successfully",
      );
      expect(response.body.data).toHaveProperty("university", null);

      const user = await User.findById(userId);
      expect(user.university).toBeNull();
      expect(user.selectedUniversity).toBeNull();
    });

    it("should return 400 if no university to remove", async () => {
      await request(app)
        .delete("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      const response = await request(app)
        .delete("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty(
        "message",
        "No university set to remove",
      );
    });
  });

  describe("GET /api/university/security", () => {
    beforeAll(async () => {
      await CampusSecurity.create({
        name: "Test Security",
        phoneNumber: "+1234567890",
        email: "security@test.edu",
        location: "Security Office",
        universityAcronym: testUniversity.acronym.toUpperCase(),
        isActive: true,
      });
    });

    beforeEach(async () => {
      await User.findByIdAndUpdate(userId, {
        $set: { university: null, selectedUniversity: null },
      });
      await request(app)
        .post("/api/university")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .send(testUniversity)
        .expect(200);
    });

    it("should get security contacts for user's university", async () => {
      const response = await request(app)
        .get("/api/university/security")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("should return all security contacts if user has no university", async () => {
      const newUser = {
        email: `no-uni-security-${Date.now()}@campus.edu`,
        name: "No University Security User",
        password: "TestPassword123",
      };

      const newAuth = await getAuthToken(newUser);

      const response = await request(app)
        .get("/api/university/security")
        .set("Authorization", `Bearer ${newAuth.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty(
        "message",
        "No university set. Showing all security contacts.",
      );
    });
  });

  describe("GET /api/university/list", () => {
    beforeAll(async () => {
      const universities = [
        { name: "University A", acronym: "UA" },
        { name: "University B", acronym: "UB" },
        { name: "University C", acronym: "UC" },
      ];

      for (const uni of universities) {
        const user = {
          email: `uni-${uni.acronym}-${Date.now()}@campus.edu`,
          name: `User ${uni.acronym}`,
          password: "TestPassword123",
        };
        const auth = await getAuthToken(user);
        await request(app)
          .post("/api/university")
          .set("Authorization", `Bearer ${auth.accessToken}`)
          .send(uni)
          .expect(200);
      }
    });

    it("should get list of all universities", async () => {
      const response = await request(app)
        .get("/api/university/list")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("count");
      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });
  });

  describe("GET /api/university/search", () => {
    beforeAll(async () => {
      const universities = [
        { name: "Harvard University", acronym: "HU" },
        { name: "Stanford University", acronym: "SU" },
        { name: "Massachusetts Institute of Technology", acronym: "MIT" },
      ];

      for (const uni of universities) {
        const user = {
          email: `search-${uni.acronym}-${Date.now()}@campus.edu`,
          name: `User ${uni.acronym}`,
          password: "TestPassword123",
        };
        const auth = await getAuthToken(user);
        await request(app)
          .post("/api/university")
          .set("Authorization", `Bearer ${auth.accessToken}`)
          .send(uni)
          .expect(200);
      }
    });

    it("should search universities by name", async () => {
      const response = await request(app)
        .get("/api/university/search?q=Harvard")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(
        response.body.data.some((uni) => uni.name.includes("Harvard")),
      ).toBe(true);
    });

    it("should search universities by acronym", async () => {
      const response = await request(app)
        .get("/api/university/search?q=MIT")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some((uni) => uni.acronym === "MIT")).toBe(
        true,
      );
    });

    it("should return 400 for empty search query", async () => {
      const response = await request(app)
        .get("/api/university/search?q=")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty(
        "message",
        "Search query is required",
      );
    });
  });

  describe("GET /api/university/:acronym", () => {
    beforeAll(async () => {
      const uniData = { name: "Test University Details", acronym: "TUD" };
      const user1 = {
        email: `tud-user1-${Date.now()}@campus.edu`,
        name: "TUD User 1",
        password: "TestPassword123",
      };
      const user2 = {
        email: `tud-user2-${Date.now()}@campus.edu`,
        name: "TUD User 2",
        password: "TestPassword123",
      };

      const auth1 = await getAuthToken(user1);
      const auth2 = await getAuthToken(user2);

      await request(app)
        .post("/api/university")
        .set("Authorization", `Bearer ${auth1.accessToken}`)
        .send(uniData)
        .expect(200);

      await request(app)
        .post("/api/university")
        .set("Authorization", `Bearer ${auth2.accessToken}`)
        .send(uniData)
        .expect(200);

      await CampusSecurity.create({
        name: "TUD Security",
        phoneNumber: "+1234567899",
        email: "tud-security@test.edu",
        location: "TUD Campus",
        universityAcronym: "TUD",
        isActive: true,
      });
    });

    it("should get university details by acronym", async () => {
      const response = await request(app)
        .get("/api/university/TUD")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("acronym", "TUD");
      expect(response.body.data).toHaveProperty("securityContacts");
      expect(Array.isArray(response.body.data.securityContacts)).toBe(true);
      expect(response.body.data).toHaveProperty("totalUsers", 2);
    });

    it("should return 404 for non-existent university", async () => {
      const response = await request(app)
        .get("/api/university/NONEXISTENT")
        .set("Authorization", `Bearer ${authData.accessToken}`)
        .expect(404);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty(
        "message",
        'University with acronym "NONEXISTENT" not found',
      );
    });
  });
});
