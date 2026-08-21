import { body, validationResult } from "express-validator";
import { EMAIL_REGEX } from "../utils/regex.js";

// Centralized phone number regex.
export const PHONE_REGEX = /^[+]?[\d\s().-]{7,20}$/;

// A phone number should end up with a sane number of actual digits once
const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

const isPlausiblePhoneShape = (value) => {
  if (!PHONE_REGEX.test(value)) return false;
  const digitsOnly = value.replace(/\D/g, "");
  return (
    digitsOnly.length >= MIN_PHONE_DIGITS &&
    digitsOnly.length <= MAX_PHONE_DIGITS
  );
};

// Structural check (exactly one '@', non-empty local/domain parts, domain contains a dot)
export const validateEmail = (value) => {
  if (!value || typeof value !== "string") {
    throw new Error("Invalid email format");
  }

  const parts = value.split("@");
  if (parts.length !== 2) {
    throw new Error("Invalid email format");
  }

  const [local, domain] = parts;
  if (local.length === 0 || domain.length === 0 || !domain.includes(".")) {
    throw new Error("Invalid email format");
  }

  if (!EMAIL_REGEX.test(value)) {
    throw new Error("Invalid email format");
  }

  return true;
};

// Centralized phone number validator function
export const validatePhoneNumber = (value) => {
  if (!value) return true;
  if (typeof value !== "string") return false;
  return isPlausiblePhoneShape(value.trim());
};

// Centralized phone number validation chain for express-validator
export const isValidPhoneNumber = (optional = true) => {
  let chain = body("phoneNumber");
  if (optional) {
    chain = chain.optional();
  } else {
    chain = chain.notEmpty().withMessage("Phone number is required");
  }
  return chain
    .isString()
    .withMessage("Phone number must be a string")
    .custom((value) => {
      if (!value) return true;
      if (!isPlausiblePhoneShape(value.trim())) {
        throw new Error("Please enter a valid phone number");
      }
      return true;
    });
};

// Validation schemas
export const authValidation = {
  signup: [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please enter a valid email address")
      .normalizeEmail(),
    body("name")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Name cannot exceed 100 characters"),
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/)
      .withMessage("Password must contain at least one letter and one number"),
  ],

  verifyOTP: [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please enter a valid email"),
    body("otpCode")
      .notEmpty()
      .withMessage("OTP code is required")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be 6 digits")
      .isNumeric()
      .withMessage("OTP must be numeric"),
  ],

  resendOTP: [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please enter a valid email"),
  ],

  login: [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please enter a valid email address")
      .normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],

  forgotPassword: [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please enter a valid email address")
      .normalizeEmail(),
  ],

  verifyResetOTP: [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please enter a valid email"),
    body("otpCode")
      .notEmpty()
      .withMessage("OTP code is required")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be 6 digits")
      .isNumeric()
      .withMessage("OTP must be numeric"),
  ],

  resetPassword: [
    body("resetToken").notEmpty().withMessage("Reset token is required"),
    body("newPassword")
      .notEmpty()
      .withMessage("New password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/)
      .withMessage("Password must contain at least one letter and one number"),
    body("confirmPassword")
      .notEmpty()
      .withMessage("Please confirm your password")
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage("Passwords do not match"),
  ],

  changePassword: [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .notEmpty()
      .withMessage("New password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/)
      .withMessage("Password must contain at least one letter and one number"),
    body("confirmPassword")
      .notEmpty()
      .withMessage("Please confirm your password")
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage("Passwords do not match"),
  ],
};

export const contactValidation = {
  create: [
    body("name")
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ max: 100 })
      .withMessage("Name cannot exceed 100 characters"),
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please enter a valid email address"),
    isValidPhoneNumber(true),
    body("relationship")
      .notEmpty()
      .withMessage("Relationship is required")
      .isIn(["parent", "sibling", "friend", "roommate", "partner", "other"])
      .withMessage("Invalid relationship type"),
  ],

  update: [
    body("name")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Name cannot exceed 100 characters"),
    body("email")
      .optional()
      .isEmail()
      .withMessage("Please enter a valid email address"),
    isValidPhoneNumber(true),
    body("relationship")
      .optional()
      .isIn(["parent", "sibling", "friend", "roommate", "partner", "other"])
      .withMessage("Invalid relationship type"),
  ],
};

export const sosValidation = {
  trigger: [
    body("latitude")
      .notEmpty()
      .withMessage("Location is required to send an SOS alert")
      .isFloat({ min: -90, max: 90 })
      .withMessage("Invalid latitude"),
    body("longitude")
      .notEmpty()
      .withMessage("Location is required to send an SOS alert")
      .isFloat({ min: -180, max: 180 })
      .withMessage("Invalid longitude"),
    body("locationAvailable")
      .optional()
      .isBoolean()
      .withMessage("locationAvailable must be boolean"),
    body("locationLabel")
      .optional()
      .isString()
      .withMessage("locationLabel must be a string")
      .isLength({ max: 200 })
      .withMessage("locationLabel cannot exceed 200 characters"),
  ],

  cancel: [
    body("reason")
      .optional()
      .isIn(["false_alarm", "user_error", "other", "resolved"])
      .withMessage("Invalid cancellation reason"),
  ],

  /** A real response occurred (e.g. campus security responded), as opposed
   * to the user self-cancelling. Not subject to the 5-minute cancellation
   * window that /cancel enforces, so no time-based validation here.
   */
  resolve: [
    body("resolvedBy")
      .optional()
      .isIn(["user", "campus_security", "admin", "system"])
      .withMessage("Invalid resolvedBy value"),
    body("resolutionReason")
      .optional()
      .isString()
      .withMessage("Resolution reason must be a string")
      .isLength({ max: 500 })
      .withMessage("Resolution reason cannot exceed 500 characters"),
  ],
};

export const profileValidation = {
  updateName: [
    body("name")
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ max: 100 })
      .withMessage("Name cannot exceed 100 characters"),
  ],

  updateEmail: [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please enter a valid email address"),
  ],
};

// Validation result handler
export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    }));

    return res.status(400).json({
      success: false,
      message: formattedErrors[0]?.message || "Validation failed",
      errors: formattedErrors,
    });
  };
};

export const universityValidation = {
  create: [
    body("name")
      .notEmpty()
      .withMessage("University name is required")
      .isLength({ max: 100 })
      .withMessage("University name cannot exceed 100 characters"),
    body("acronym")
      .notEmpty()
      .withMessage("University acronym is required")
      .isLength({ min: 2, max: 10 })
      .withMessage("Acronym must be between 2 and 10 characters")
      .matches(/^[A-Za-z0-9]+$/)
      .withMessage("Acronym can only contain letters and numbers"),
    body("location")
      .optional()
      .isString()
      .withMessage("Location must be a string"),
  ],
  update: [
    body("name")
      .optional()
      .isLength({ max: 100 })
      .withMessage("University name cannot exceed 100 characters"),
    body("acronym")
      .optional()
      .isLength({ min: 2, max: 10 })
      .withMessage("Acronym must be between 2 and 10 characters")
      .matches(/^[A-Za-z0-9]+$/)
      .withMessage("Acronym can only contain letters and numbers"),
    body("location")
      .optional()
      .isString()
      .withMessage("Location must be a string"),
  ],
};

export default {
  validate,
  authValidation,
  contactValidation,
  universityValidation,
  sosValidation,
  profileValidation,
  validateEmail,
  validatePhoneNumber,
  isValidPhoneNumber,
  PHONE_REGEX,
};
