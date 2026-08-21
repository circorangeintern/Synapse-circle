import User from "../models/User.js";

/**
 * Middleware to ensure user has a university set
 */
const requireUniversity = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.university?.acronym) {
      return res.status(400).json({
        success: false,
        message:
          "University is required for this action. Please set your university first.",
        code: "UNIVERSITY_REQUIRED",
      });
    }

    req.userUniversity = user.university;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to ensure university has security contacts
 */
const requireUniversitySecurity = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.university?.acronym) {
      return res.status(400).json({
        success: false,
        message: "University is required for this action.",
        code: "UNIVERSITY_REQUIRED",
      });
    }

    const CampusSecurity = await import("../models/CampusSecurity.js");
    const securityContacts = await CampusSecurity.default.find({
      universityAcronym: user.university.acronym,
      isActive: true,
    });

    if (securityContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No security contacts found for your university. Please contact your campus security.",
        code: "NO_UNIVERSITY_SECURITY",
      });
    }

    req.userUniversity = user.university;
    req.universitySecurity = securityContacts;
    next();
  } catch (error) {
    next(error);
  }
};

export { requireUniversity, requireUniversitySecurity };
