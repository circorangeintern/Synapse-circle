import mongoose from "mongoose";

const campusSecuritySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Security name is required"],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    location: {
      type: String,
      trim: true,
    },
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
    },
    universityAcronym: {
      type: String,
      required: [
        true,
        "University acronym is required for campus security contacts",
      ],
      trim: true,
      uppercase: true,
      index: true,
    },
    operatingHours: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
campusSecuritySchema.index({ isActive: 1, isPrimary: 1 });
campusSecuritySchema.index({ universityAcronym: 1, isActive: 1 });

// Pre-save validation - ensure universityAcronym is provided
campusSecuritySchema.pre("save", function (next) {
  if (!this.universityAcronym) {
    const error = new Error(
      "University acronym is required for campus security contacts",
    );
    error.statusCode = 400;
    return next(error);
  }
  next();
});

// Static method to get security contacts by university
campusSecuritySchema.statics.getByUniversity = function (acronym) {
  if (!acronym) {
    return this.find({ isActive: true });
  }
  return this.find({
    universityAcronym: acronym.toUpperCase().trim(),
    isActive: true,
  });
};

// Static method to check if a university has security contacts
campusSecuritySchema.statics.hasSecurityForUniversity = async function (
  acronym,
) {
  if (!acronym) return false;
  const count = await this.countDocuments({
    universityAcronym: acronym.toUpperCase().trim(),
    isActive: true,
  });
  return count > 0;
};

// Method to get security contacts for a user
campusSecuritySchema.statics.getForUser = async function (userId) {
  const User = mongoose.model("User");
  const user = await User.findById(userId).select("university");

  if (!user || !user.university?.acronym) {
    return [];
  }

  return this.find({
    universityAcronym: user.university.acronym,
    isActive: true,
  });
};

export default mongoose.model("CampusSecurity", campusSecuritySchema);
