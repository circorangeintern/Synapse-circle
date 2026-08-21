import User from "../models/User.js";
import CampusSecurity from "../models/CampusSecurity.js";
import TrustedContact from "../models/TrustedContact.js";
import { logger } from "../utils/logger.js";

class UniversitySyncService {
  /**
   * Update user's university and sync associated data
   */
  async updateUserUniversity(userId, universityData) {
    try {
      const { name, acronym, location } = universityData;

      if (!acronym) {
        throw new Error("University acronym is required");
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      const oldUniversity = user.university?.acronym || null;

      // Check if campus security exists for this university
      const securityContacts = await CampusSecurity.find({
        universityAcronym: acronym.toUpperCase(),
        isActive: true,
      });

      // Update user's university
      const updateData = {
        university: {
          name:
            name?.trim() || user.university?.name || `University ${acronym}`,
          acronym: acronym.toUpperCase().trim(),
          location: location?.trim() || user.university?.location || "",
        },
        selectedUniversity:
          name?.trim() || user.selectedUniversity || `University ${acronym}`,
      };

      // If the user is still in university step, move to contacts
      if (user.onboardingStep === "university") {
        updateData.onboardingStep = "contacts";
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true },
      );

      logger.info(
        `User ${userId} university updated: ${oldUniversity} -> ${acronym}`,
        {
          securityContactsFound: securityContacts.length,
          hasSecurity: securityContacts.length > 0,
        },
      );

      return {
        success: true,
        oldUniversity,
        newUniversity: updatedUser.university,
        hasSecurityContacts: securityContacts.length > 0,
        securityContactsCount: securityContacts.length,
        securityContacts,
        message:
          securityContacts.length > 0
            ? "University updated successfully with security contacts"
            : "University updated successfully. No security contacts found for this university.",
      };
    } catch (error) {
      logger.error("University sync error:", error);
      throw error;
    }
  }

  /**
   * Get security contacts for a user's university
   */
  async getUserSecurityContacts(userId) {
    const user = await User.findById(userId).select("university");
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.university?.acronym) {
      return {
        contacts: [],
        university: null,
        message: "No university set for this user",
      };
    }

    const contacts = await CampusSecurity.find({
      universityAcronym: user.university.acronym,
      isActive: true,
    });

    return {
      contacts,
      university: user.university,
      count: contacts.length,
      hasContacts: contacts.length > 0,
    };
  }

  /**
   * Validate if a user has security contacts for their university
   */
  async validateUserSecurity(userId) {
    const result = await this.getUserSecurityContacts(userId);
    return {
      hasSecurity: result.hasContacts,
      count: result.count,
      contacts: result.contacts,
      university: result.university,
    };
  }

  /**
   * Get all users with a specific university
   */
  async getUniversityUsers(acronym) {
    const normalizedAcronym = acronym.toUpperCase().trim();

    const users = await User.find({
      "university.acronym": normalizedAcronym,
      isActive: true,
      isDeleted: false,
    }).select("name email profilePicture university");

    const securityContacts = await CampusSecurity.find({
      universityAcronym: normalizedAcronym,
      isActive: true,
    });

    return {
      acronym: normalizedAcronym,
      users,
      securityContacts,
      totalUsers: users.length,
      hasSecurity: securityContacts.length > 0,
    };
  }

  /**
   * Synchronize a user's trust contacts when university changes
   * (Optional: Add university context to trusted contacts)
   */
  async syncTrustedContactsWithUniversity(userId, universityAcronym) {
    const contacts = await TrustedContact.find({
      userId,
      isActive: true,
    });

    logger.info(
      `User ${userId} has ${contacts.length} trusted contacts for university ${universityAcronym}`,
    );

    return {
      contacts,
      count: contacts.length,
    };
  }
}

export default new UniversitySyncService();
