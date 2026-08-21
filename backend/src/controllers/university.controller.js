import User from "../models/User.js";
import CampusSecurity from "../models/CampusSecurity.js";
import { logger } from "../utils/logger.js";
import universitySyncService from "../services/universitySyncService.js";

/**
 * University Controller
 * Handles all university-related operations for users
 * Uses the university subdocument stored directly on the User model
 *
 * UNIFORM NAMING CONVENTION:
 * - All endpoints use: name, acronym, location
 * - The university subdocument stores: name, acronym, location
 * - No other field names are accepted
 */
class UniversityController {
  /**
   * POST /api/university
   * Save user's university with sync
   */
  saveUniversity = async (req, res) => {
    try {
      const { name, acronym, location } = req.body;
      const userId = req.userId;

      // Validate required fields
      if (!name || !acronym) {
        return res.status(400).json({
          success: false,
          message: "University name and acronym are required",
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found. Please log in again.",
        });
      }

      // Check if university already exists
      if (user.university?.acronym) {
        return res.status(409).json({
          success: false,
          message: "University already set for this user. Use PUT to update.",
          data: { university: user.university },
        });
      }

      // Use the sync service to update university
      const result = await universitySyncService.updateUserUniversity(userId, {
        name,
        acronym,
        location,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          university: result.newUniversity,
          hasSecurityContacts: result.hasSecurityContacts,
          securityContactsCount: result.securityContactsCount,
          onboardingStep: result.newUniversity?.onboardingStep || "contacts",
        },
      });
    } catch (error) {
      logger.error("Error saving university:", error);
      throw error;
    }
  };

  /**
   * GET /api/university
   * Get user's university
   */
  getUniversity = async (req, res) => {
    try {
      const user = await User.findById(req.userId).select(
        "university onboardingStep",
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found. Please log in again.",
        });
      }

      let university = null;
      if (user.university?.acronym) {
        university = user.university;
      }

      res.status(200).json({
        success: true,
        data: {
          university: university,
          onboardingStep: user.onboardingStep || "welcome",
        },
      });
    } catch (error) {
      logger.error("Error getting university:", error);
      throw error;
    }
  };

  /**
   * PUT /api/university
   * Update user's university with sync
   */
  updateUniversity = async (req, res) => {
    try {
      const { name, acronym, location } = req.body;
      const userId = req.userId;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found. Please log in again.",
        });
      }

      // Check if at least one field is provided
      if (!name && !acronym && !location) {
        return res.status(400).json({
          success: false,
          message:
            "At least one field (name, acronym, or location) is required",
        });
      }

      // Build update data with current values as fallbacks
      const updateData = {
        name: name || user.university?.name,
        acronym: acronym || user.university?.acronym,
        location: location || user.university?.location,
      };

      // Use the sync service to update university
      const result = await universitySyncService.updateUserUniversity(
        userId,
        updateData,
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          university: result.newUniversity,
          hasSecurityContacts: result.hasSecurityContacts,
          securityContactsCount: result.securityContactsCount,
        },
      });
    } catch (error) {
      logger.error("Error updating university:", error);
      throw error;
    }
  };

  /**
   * DELETE /api/university
   * Remove user's university
   */
  deleteUniversity = async (req, res) => {
    try {
      const userId = req.userId;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found. Please log in again.",
        });
      }

      const hasUniversity = user.university?.acronym || user.selectedUniversity;
      if (!hasUniversity) {
        return res.status(400).json({
          success: false,
          message: "No university set to remove",
        });
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            university: null,
            selectedUniversity: null,
          },
        },
        {
          new: true,
          runValidators: false,
        },
      ).select("university onboardingStep");

      logger.info(`University removed for user ${userId}`);

      res.status(200).json({
        success: true,
        message: "University removed successfully",
        data: {
          university: null,
          onboardingStep: updatedUser?.onboardingStep || "welcome",
        },
      });
    } catch (error) {
      logger.error("Error removing university:", error);
      throw error;
    }
  };

  /**
   * GET /api/university/security
   * Get campus security contacts for user's university
   */
  getSecurityContacts = async (req, res) => {
    try {
      const user = await User.findById(req.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found. Please log in again.",
        });
      }

      if (!user.university?.acronym) {
        const securityContacts = await CampusSecurity.find({ isActive: true });
        return res.status(200).json({
          success: true,
          data: securityContacts,
          message: "No university set. Showing all security contacts.",
          university: null,
        });
      }

      const securityContacts = await CampusSecurity.find({
        universityAcronym: user.university.acronym,
        isActive: true,
      });

      res.status(200).json({
        success: true,
        data: securityContacts,
        university: user.university,
      });
    } catch (error) {
      logger.error("Error getting security contacts:", error);
      throw error;
    }
  };

  /**
   * GET /api/university/list
   * Get list of all unique universities (for autocomplete)
   */
  getUniversityList = async (req, res) => {
    try {
      const userUniversities = await User.distinct("university", {
        "university.name": { $exists: true, $ne: "" },
        "university.acronym": { $exists: true, $ne: "" },
      });

      const securityContacts = await CampusSecurity.find({
        universityAcronym: { $exists: true, $ne: "" },
        isActive: true,
      });

      const uniqueMap = new Map();

      userUniversities.forEach((uni) => {
        if (uni?.acronym && uni?.name) {
          const key = uni.acronym.toUpperCase();
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, {
              name: uni.name,
              acronym: uni.acronym.toUpperCase(),
              location: uni.location || "",
            });
          }
        }
      });

      securityContacts.forEach((contact) => {
        if (contact.universityAcronym) {
          const key = contact.universityAcronym.toUpperCase();
          if (!uniqueMap.has(key)) {
            const userUni = userUniversities.find(
              (u) => u?.acronym?.toUpperCase() === key,
            );
            uniqueMap.set(key, {
              name: userUni?.name || `University ${key}`,
              acronym: key,
              location: userUni?.location || "",
            });
          }
        }
      });

      const universityList = Array.from(uniqueMap.values());

      logger.info(`Retrieved ${universityList.length} unique universities`);

      res.status(200).json({
        success: true,
        count: universityList.length,
        data: universityList,
      });
    } catch (error) {
      logger.error("Error getting university list:", error);
      throw error;
    }
  };

  /**
   * GET /api/university/search
   * Search universities by name or acronym
   */
  searchUniversities = async (req, res) => {
    try {
      const { q } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Search query must be at least 2 characters",
        });
      }

      const searchTerm = q.trim().toLowerCase();

      const userUniversities = await User.distinct("university", {
        "university.name": { $exists: true, $ne: "" },
      });

      const securityContacts = await CampusSecurity.find({
        universityAcronym: { $exists: true, $ne: "" },
        isActive: true,
      });

      const uniqueMap = new Map();

      userUniversities.forEach((uni) => {
        if (uni?.acronym && uni?.name) {
          const key = uni.acronym.toUpperCase();
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, {
              name: uni.name,
              acronym: uni.acronym.toUpperCase(),
              location: uni.location || "",
            });
          }
        }
      });

      securityContacts.forEach((contact) => {
        if (contact.universityAcronym) {
          const key = contact.universityAcronym.toUpperCase();
          if (!uniqueMap.has(key)) {
            const userUni = userUniversities.find(
              (u) => u?.acronym?.toUpperCase() === key,
            );
            uniqueMap.set(key, {
              name: userUni?.name || `University ${key}`,
              acronym: key,
              location: userUni?.location || "",
            });
          }
        }
      });

      const results = Array.from(uniqueMap.values()).filter(
        (uni) =>
          uni.name.toLowerCase().includes(searchTerm) ||
          uni.acronym.toLowerCase().includes(searchTerm) ||
          uni.location?.toLowerCase().includes(searchTerm),
      );

      res.status(200).json({
        success: true,
        count: results.length,
        data: results,
        searchTerm: q.trim(),
      });
    } catch (error) {
      logger.error("Error searching universities:", error);
      throw error;
    }
  };

  /**
   * GET /api/university/:acronym
   * Get university details by acronym
   * Shows all users from this university and security contacts
   */
  getUniversityByAcronym = async (req, res) => {
    try {
      const { acronym } = req.params;
      const normalizedAcronym = acronym.trim().toUpperCase();

      const users = await User.find({
        "university.acronym": normalizedAcronym,
        isActive: true,
      })
        .select("name email profilePicture university")
        .limit(50);

      const securityContacts = await CampusSecurity.find({
        universityAcronym: normalizedAcronym,
        isActive: true,
      });

      const universityDetails = users.length > 0 ? users[0].university : null;

      if (!universityDetails) {
        const security = await CampusSecurity.findOne({
          universityAcronym: normalizedAcronym,
          isActive: true,
        });

        if (!security) {
          return res.status(404).json({
            success: false,
            message: `University with acronym "${normalizedAcronym}" not found`,
          });
        }

        return res.status(200).json({
          success: true,
          data: {
            acronym: normalizedAcronym,
            name: "Unknown University",
            location: null,
            securityContacts,
            totalUsers: 0,
            users: [],
          },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          acronym: normalizedAcronym,
          name: universityDetails.name,
          location: universityDetails.location,
          securityContacts,
          totalUsers: users.length,
          users: users.map((user) => ({
            id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
          })),
        },
      });
    } catch (error) {
      logger.error("Error getting university by acronym:", error);
      throw error;
    }
  };
}

export default new UniversityController();
