import mongoose from "mongoose";
import config from "../utils/config.js";

const timelineEventSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      enum: [
        "sos_activated",
        "trusted_contacts_notified",
        "security_dispatched",
        "location_tracking_started",
        "resolved",
        "false_alarm",
        "cancelled",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["completed", "failed", "skipped", "pending"],
      default: "completed",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const sosAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    locationAvailable: {
      type: Boolean,
      default: false,
    },
    locationLink: {
      type: String,
    },
    locationLabel: {
      type: String,
    },
    universityName: {
      type: String,
    },
    status: {
      type: String,
      enum: ["sent", "resolved", "false_alarm", "cancelled", "failed"],
      default: "sent",
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      enum: ["false_alarm", "user_error", "other", "resolved"],
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: String,
      enum: ["user", "campus_security", "admin", "system"],
    },
    resolutionReason: {
      type: String,
      trim: true,
    },
    timeline: {
      type: [timelineEventSchema],
      default: [],
    },
    // Who was notified and their delivery status now lives exclusively in
    // the AlertRecipient collection (query with { alertId: this._id }).
    emailSubject: {
      type: String,
    },
    emailBody: {
      type: String,
    },
    emailSentAt: {
      type: Date,
    },
    emailFailureReason: {
      type: String,
    },
    deviceInfo: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
sosAlertSchema.index({ userId: 1, createdAt: -1 });
sosAlertSchema.index({ status: 1 });
sosAlertSchema.index({ createdAt: -1 });

// Method to check if cancellation is allowed
sosAlertSchema.methods.canCancel = function () {
  if (this.status !== "sent") return false;

  const now = new Date();
  const created = new Date(this.createdAt);
  const minutesPassed = (now - created) / 60000;

  return minutesPassed <= config.cancellationWindowMinutes;
};

// Method to get time remaining for cancellation
sosAlertSchema.methods.getCancellationTimeRemaining = function () {
  if (this.status !== "sent") return 0;

  const now = new Date();
  const created = new Date(this.createdAt);
  const elapsed = (now - created) / 60000;

  return Math.max(0, config.cancellationWindowMinutes - elapsed);
};

// Duration the alert was active, in whole seconds. Null while still active
// (status "sent" with no resolvedAt/cancelledAt yet).
sosAlertSchema.methods.getDurationSeconds = function () {
  const end = this.resolvedAt || this.cancelledAt;
  if (!end) return null;

  const created = new Date(this.createdAt);
  return Math.max(0, Math.round((new Date(end) - created) / 1000));
};

sosAlertSchema.methods.addTimelineEvent = function (
  event,
  status = "completed",
  timestamp = new Date(),
) {
  this.timeline.push({ event, status, timestamp });
};

export default mongoose.model("SOSAlert", sosAlertSchema);
