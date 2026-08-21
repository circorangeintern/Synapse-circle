import SOSAlert from "../models/SOSAlert.js";
import TrustedContact from "../models/TrustedContact.js";
import CampusSecurity from "../models/CampusSecurity.js";
import EmergencyDirectory from "../models/EmergencyDirectory.js";
import AlertRecipient from "../models/AlertRecipient.js";
import User from "../models/User.js";
import emailService from "./emailService.js";
import { logger } from "../utils/logger.js";

class SOSService {
  /**
   * Get user and validate existence
   */
  async _getUser(userId) {
    if (!userId) {
      const error = new Error("User authentication required");
      error.statusCode = 401;
      throw error;
    }

    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    return user;
  }

  /**
   * Get security contacts for user's university
   */
  async _getSecurityContacts(user) {
    if (!user.university?.acronym) {
      logger.warn(
        `User ${user._id} has no university set, skipping campus security`,
      );
      return [];
    }

    const securityContacts = await CampusSecurity.find({
      isActive: true,
      universityAcronym: user.university.acronym,
    });

    if (securityContacts.length === 0) {
      logger.warn(
        `No campus security found for university: ${user.university.acronym}`,
        { userId: user._id, university: user.university.acronym },
      );
    }

    return securityContacts;
  }

  /**
   * Get emergency directory contacts
   */
  async _getEmergencyContacts(user) {
    const emergencyQuery = {
      isActive: true,
      isVerified: true,
    };

    if (user.university?.acronym) {
      emergencyQuery.$or = [
        { universityAcronym: user.university.acronym },
        { universityAcronym: { $exists: false } },
      ];
    }

    return await EmergencyDirectory.find(emergencyQuery)
      .limit(10)
      .sort({ universityAcronym: 1 });
  }

  /**
   * Build recipient list from contacts
   */
  _buildRecipients(trustedContacts, securityContacts, emergencyContacts) {
    const recipients = [];

    trustedContacts.forEach((contact) => {
      recipients.push({
        type: "trusted_contact",
        recipientId: contact._id,
        email: contact.email,
        name: contact.name,
        relationship: contact.relationship,
      });
    });

    securityContacts.forEach((security) => {
      recipients.push({
        type: "campus_security",
        recipientId: security._id,
        email: security.email,
        name: security.name,
        relationship: "campus_security",
      });
    });

    emergencyContacts.forEach((emergency) => {
      recipients.push({
        type: "emergency_directory",
        recipientId: emergency._id,
        email: emergency.email,
        name: emergency.name,
        relationship: emergency.type,
      });
    });

    return recipients;
  }

  /**
   * Create alert document
   */
  async _createAlert(userId, locationData, user, locationLink) {
    const {
      latitude,
      longitude,
      locationAvailable = true,
      locationLabel = null,
    } = locationData;
    const activatedAt = new Date();

    return await SOSAlert.create({
      userId,
      latitude: latitude || null,
      longitude: longitude || null,
      locationAvailable,
      locationLink,
      locationLabel,
      universityName: user.university?.name || null,
      message:
        "Help me, I am in an unsafe environment and I feel unsafe, here's my live location.",
      status: "sent",
      timeline: [
        {
          event: "sos_activated",
          status: "completed",
          timestamp: activatedAt,
        },
      ],
    });
  }

  /**
   * Save recipient delivery results
   */
  async _saveRecipientResults(alertId, userId, recipients, emailResults) {
    const notifiedAt = new Date();
    const recipientOperations = recipients.map((recipient, index) => ({
      insertOne: {
        document: {
          alertId: alertId,
          userId,
          recipientType: recipient.type,
          recipientId: recipient.recipientId,
          name: recipient.name,
          email: recipient.email,
          relationship: recipient.relationship,
          emailStatus: emailResults[index].success ? "delivered" : "failed",
          emailSentAt: notifiedAt,
          emailError: emailResults[index].success
            ? null
            : emailResults[index].error,
          delivered: emailResults[index].success,
        },
      },
    }));

    if (recipientOperations.length > 0) {
      await AlertRecipient.bulkWrite(recipientOperations, { ordered: false });
    }

    return notifiedAt;
  }

  /**
   * Determine status for a set of results
   */
  _getStatusForResults(results) {
    if (results.length === 0) return "skipped";
    return results.some((r) => r.success) ? "completed" : "failed";
  }

  /**
   * Build response timeline
   */
  _buildResponseTimeline(
    activatedAt,
    notifiedAt,
    trustedContacts,
    securityContacts,
    trustedResults,
    securityResults,
  ) {
    const timeline = [
      {
        event: "SOS Triggered",
        timestamp: activatedAt.toISOString(),
      },
    ];

    if (trustedContacts.length > 0) {
      timeline.push({
        event: "Trusted Contacts Notified",
        timestamp: notifiedAt.toISOString(),
        status: this._getStatusForResults(trustedResults),
        count: trustedContacts.length,
      });
    }

    if (securityContacts.length > 0) {
      timeline.push({
        event: "Campus Security Notified",
        timestamp: notifiedAt.toISOString(),
        status: this._getStatusForResults(securityResults),
        count: securityContacts.length,
      });
    }

    timeline.push({
      event: "Location Tracking Started",
      timestamp: activatedAt.toISOString(),
    });

    return timeline;
  }

  /**
   * Validate location and contacts
   */
  _validateLocationAndContacts(
    latitude,
    longitude,
    trustedContacts,
    securityContacts,
    emergencyContacts,
  ) {
    if (!latitude || !longitude) {
      const error = new Error(
        "Location is required to send an SOS alert. Please enable location services.",
      );
      error.statusCode = 400;
      throw error;
    }

    if (
      trustedContacts.length === 0 &&
      securityContacts.length === 0 &&
      emergencyContacts.length === 0
    ) {
      const error = new Error(
        "No contacts available. Please add trusted contacts first.",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * Trigger an SOS alert
   */
  async triggerSOS(userId, locationData) {
    try {
      const { latitude, longitude } = locationData;

      // Get user
      const user = await this._getUser(userId);

      // Get contacts
      const trustedContacts = await TrustedContact.find({
        userId,
        isActive: true,
      });
      const securityContacts = await this._getSecurityContacts(user);
      const emergencyContacts = await this._getEmergencyContacts(user);

      // Validate
      this._validateLocationAndContacts(
        latitude,
        longitude,
        trustedContacts,
        securityContacts,
        emergencyContacts,
      );

      // Generate location link
      const locationLink =
        latitude && longitude
          ? `https://www.google.com/maps?q=${latitude},${longitude}`
          : null;

      // Create alert
      const activatedAt = new Date();
      const alert = await this._createAlert(
        userId,
        locationData,
        user,
        locationLink,
      );

      // Build recipients
      const recipients = this._buildRecipients(
        trustedContacts,
        securityContacts,
        emergencyContacts,
      );

      // Prepare email data
      const FIXED_MESSAGE =
        "Help me, I am in an unsafe environment and I feel unsafe, here's my live location.";
      const emailData = {
        userName: user.name || user.email,
        userEmail: user.email,
        latitude,
        longitude,
        locationLink,
        alertId: alert._id.toString(),
        isCancelled: false,
        timestamp: new Date().toISOString(),
        message: FIXED_MESSAGE,
        contacts: recipients.map((r) => ({
          email: r.email,
          name: r.name,
          relationship: r.relationship,
          type: r.type,
        })),
      };

      // Send emails
      const emailResults = await emailService.sendBulkSOSAlerts(emailData);
      const notifiedAt = await this._saveRecipientResults(
        alert._id,
        userId,
        recipients,
        emailResults,
      );

      // Split results
      const trustedResults = emailResults.slice(0, trustedContacts.length);
      const securityResults = emailResults.slice(
        trustedContacts.length,
        trustedContacts.length + securityContacts.length,
      );

      // Add timeline events
      alert.addTimelineEvent(
        "trusted_contacts_notified",
        this._getStatusForResults(trustedResults),
        notifiedAt,
      );
      alert.addTimelineEvent(
        "security_dispatched",
        this._getStatusForResults(securityResults),
        notifiedAt,
      );
      alert.addTimelineEvent(
        "location_tracking_started",
        "completed",
        activatedAt,
      );

      alert.emailSentAt = notifiedAt;
      await alert.save();

      // Send confirmation email (fire and forget)
      Promise.resolve(
        emailService.sendSOSConfirmationToUser(userId, {
          alertId: alert._id,
          latitude,
          longitude,
          locationLink,
          message: FIXED_MESSAGE,
          timestamp: new Date().toISOString(),
        }),
      ).catch((err) => {
        logger.error("SOS confirmation email failed:", err);
      });

      // Build response
      const notifications = recipients.map((recipient, index) => ({
        type: recipient.type,
        name: recipient.name,
        email: recipient.email,
        relationship: recipient.relationship,
        delivered: emailResults[index].success,
        status: emailResults[index].success ? "sent" : "failed",
      }));

      const deliveredCount = notifications.filter((n) => n.delivered).length;
      const totalCount = notifications.length;

      logger.info(
        `SOS alert ${alert._id} sent to ${deliveredCount}/${totalCount} recipients`,
      );

      const responseTimeline = this._buildResponseTimeline(
        activatedAt,
        notifiedAt,
        trustedContacts,
        securityContacts,
        trustedResults,
        securityResults,
      );

      return {
        success: true,
        alertId: alert._id,
        status: alert.status,
        message: FIXED_MESSAGE,
        contactsNotified: notifications,
        deliveredCount,
        totalCount,
        responseTimeline,
        summary: `Alert sent to ${deliveredCount} of ${totalCount} recipients`,
      };
    } catch (error) {
      logger.error("SOS trigger error:", error);
      throw error;
    }
  }

  /**
   * Cancel an SOS alert. Must happen within the 5-minute cancellation
   * window.
   */
  async cancelSOS(alertId, userId, reason = "false_alarm") {
    try {
      const alert = await SOSAlert.findOne({ _id: alertId, userId });

      if (!alert) {
        const error = new Error("Alert not found");
        error.statusCode = 404;
        throw error;
      }

      if (alert.status !== "sent") {
        const error = new Error(
          `Alert cannot be cancelled (status: ${alert.status})`,
        );
        error.statusCode = 400;
        throw error;
      }

      // Check cancellation window
      if (!alert.canCancel()) {
        const error = new Error("Cancellation window has passed (5 minutes)");
        error.statusCode = 400;
        throw error;
      }

      // Determine final status
      let finalStatus;
      if (reason === "false_alarm") {
        finalStatus = "false_alarm";
      } else if (reason === "resolved") {
        finalStatus = "resolved";
      } else {
        finalStatus = "cancelled";
      }

      const cancelledAt = new Date();

      // Update alert
      alert.status = finalStatus;
      alert.cancelledAt = cancelledAt;
      alert.cancellationReason = reason;
      alert.resolvedAt = cancelledAt;
      alert.resolvedBy = "user";
      alert.resolutionReason = reason;
      alert.addTimelineEvent(finalStatus, "completed", cancelledAt);
      await alert.save();

      // Get user
      const user = await User.findById(userId);
      const recipients = await AlertRecipient.find({ alertId });

      if (recipients.length > 0) {
        const contacts = recipients.map((r) => ({
          email: r.email,
          name: r.name,
          relationship: r.relationship,
          type: r.recipientType,
        }));

        const emailData = {
          userName: user.name || user.email,
          userEmail: user.email,
          latitude: alert.latitude,
          longitude: alert.longitude,
          locationLink: alert.locationLink,
          alertId: alert._id.toString(),
          isCancelled: true,
          timestamp: new Date().toISOString(),
          timeTriggered: alert.createdAt.toISOString(),
          timeCancelled: cancelledAt.toISOString(),
          contacts,
          status: finalStatus,
        };

        // Send emails to recipients
        await emailService.sendBulkSOSAlerts(emailData);

        let statusMessage = "cancelled";

        if (finalStatus === "false_alarm") {
          statusMessage = "marked as a false alarm";
        } else if (finalStatus === "resolved") {
          statusMessage = "resolved";
        }

        // Send confirmation email to user
        await emailService.sendSOSConfirmationToUser(userId, {
          alertId: alert._id,
          latitude: alert.latitude,
          longitude: alert.longitude,
          locationLink: alert.locationLink,
          message: `Your SOS alert has been ${statusMessage}`,
          timestamp: new Date().toISOString(),
          status: finalStatus,
          isCancellation: true,
        });

        // Update recipient records
        await AlertRecipient.updateMany(
          { alertId },
          {
            delivered: true,
            emailStatus: "delivered",
          },
        );
      }

      logger.info(
        `SOS alert ${alertId} marked ${finalStatus} by user ${userId}`,
      );

      return {
        success: true,
        alertId: alert._id,
        status: alert.status,
        message: "Alert cancelled successfully",
      };
    } catch (error) {
      logger.error("SOS cancellation error:", error);
      throw error;
    }
  }

  /**
   * Resolve an SOS alert - a real response occurred
   */
  async resolveSOS(
    alertId,
    userId,
    { resolvedBy = "user", resolutionReason } = {},
  ) {
    try {
      const alert = await SOSAlert.findOne({ _id: alertId, userId });

      if (!alert) {
        const error = new Error("Alert not found");
        error.statusCode = 404;
        throw error;
      }

      if (alert.status !== "sent") {
        const error = new Error(
          `Alert cannot be resolved (status: ${alert.status})`,
        );
        error.statusCode = 400;
        throw error;
      }

      const resolvedAt = new Date();

      alert.status = "resolved";
      alert.resolvedAt = resolvedAt;
      alert.resolvedBy = resolvedBy;
      alert.resolutionReason = resolutionReason || null;
      alert.addTimelineEvent("resolved", "completed", resolvedAt);
      await alert.save();

      // Send emails to recipients and user
      const user = await User.findById(userId);
      const recipients = await AlertRecipient.find({ alertId });

      if (recipients.length > 0) {
        const contacts = recipients.map((r) => ({
          email: r.email,
          name: r.name,
          relationship: r.relationship,
          type: r.recipientType,
        }));

        const emailData = {
          userName: user.name || user.email,
          userEmail: user.email,
          latitude: alert.latitude,
          longitude: alert.longitude,
          locationLink: alert.locationLink,
          alertId: alert._id.toString(),
          isCancelled: false,
          timestamp: new Date().toISOString(),
          timeTriggered: alert.createdAt.toISOString(),
          timeResolved: resolvedAt.toISOString(),
          contacts,
          status: "resolved",
          resolvedBy,
          resolutionReason,
          message: `This SOS alert has been resolved by ${resolvedBy}. Reason: ${resolutionReason || "No reason provided"}`,
        };

        // Send emails to recipients (use a new template for resolved alerts)
        await emailService.sendBulkResolvedAlerts(emailData);

        // Send confirmation email to user
        await emailService.sendSOSConfirmationToUser(userId, {
          alertId: alert._id,
          latitude: alert.latitude,
          longitude: alert.longitude,
          locationLink: alert.locationLink,
          message: `Your SOS alert has been resolved by ${resolvedBy}. ${resolutionReason ? "Reason: " + resolutionReason : ""}`,
          timestamp: new Date().toISOString(),
          status: "resolved",
          isResolution: true,
          resolvedBy,
          resolutionReason,
        });

        // Update recipient records
        await AlertRecipient.updateMany(
          { alertId },
          {
            delivered: true,
            emailStatus: "delivered",
          },
        );
      }

      logger.info(`SOS alert ${alertId} resolved (by: ${resolvedBy})`);

      return {
        success: true,
        alertId: alert._id,
        status: alert.status,
        message: "Alert resolved successfully",
      };
    } catch (error) {
      logger.error("SOS resolution error:", error);
      throw error;
    }
  }

  /**
   * Get alert history for a user
   */
  async getAlertHistory(userId, options = {}) {
    try {
      const { limit = 20, offset = 0, status } = options;

      const query = { userId };
      if (status) {
        query.status = status;
      }

      const alerts = await SOSAlert.find(query)
        .select(
          "status createdAt latitude longitude locationAvailable locationLink locationLabel universityName cancelledAt cancellationReason resolvedAt resolvedBy resolutionReason message timeline",
        )
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec();

      const total = await SOSAlert.countDocuments(query);

      const alertIds = alerts.map((alert) => alert._id);
      const recipientStats = await AlertRecipient.aggregate([
        { $match: { alertId: { $in: alertIds } } },
        {
          $group: {
            _id: "$alertId",
            total: { $sum: 1 },
            delivered: { $sum: { $cond: ["$delivered", 1, 0] } },
          },
        },
      ]);
      const statsByAlertId = new Map(
        recipientStats.map((stat) => [stat._id.toString(), stat]),
      );

      // Get detailed recipient info for each alert
      const recipientsByAlert = await AlertRecipient.aggregate([
        { $match: { alertId: { $in: alertIds } } },
        {
          $group: {
            _id: "$alertId",
            recipients: {
              $push: {
                name: "$name",
                email: "$email",
                relationship: "$relationship",
                delivered: "$delivered",
                emailStatus: "$emailStatus",
              },
            },
          },
        },
      ]);
      const recipientsMap = new Map(
        recipientsByAlert.map((item) => [item._id.toString(), item.recipients]),
      );

      return {
        alerts: alerts.map((alert) => {
          const stats = statsByAlertId.get(alert._id.toString()) || {
            total: 0,
            delivered: 0,
          };

          const endTime = alert.resolvedAt || alert.cancelledAt || null;
          const durationMs = endTime
            ? Math.max(
                0,
                new Date(endTime).getTime() -
                  new Date(alert.createdAt).getTime(),
              )
            : null;

          // Build timeline from the alert's timeline array
          const timelineEvents = alert.timeline || [];
          const responseTimeline = timelineEvents.map((event) => ({
            event: event.event,
            timestamp: event.timestamp,
            status: event.status,
          }));

          // Get recipients for this alert
          const recipients = recipientsMap.get(alert._id.toString()) || [];

          return {
            id: alert._id,
            status: alert.status,
            timestamp: alert.createdAt,
            universityName: alert.universityName,
            locationLabel: alert.locationLabel,
            location: alert.locationAvailable
              ? {
                  latitude: alert.latitude,
                  longitude: alert.longitude,
                  available: alert.locationAvailable,
                }
              : null,
            locationLink: alert.locationLink,
            message: alert.message,
            resolvedAt: alert.resolvedAt,
            resolvedBy: alert.resolvedBy,
            resolutionReason: alert.resolutionReason,
            cancelledAt: alert.cancelledAt,
            cancellationReason: alert.cancellationReason,
            durationMs,
            recipients: recipients.map((r) => ({
              name: r.name,
              email: r.email,
              relationship: r.relationship,
              delivered: r.delivered,
              status: r.delivered ? "sent" : "failed",
            })),
            recipientStats: {
              total: stats.total,
              delivered: stats.delivered,
              failed: stats.total - stats.delivered,
            },
            responseTimeline,
          };
        }),
        total,
        offset,
        limit,
      };
    } catch (error) {
      logger.error("Alert history error:", error);
      throw error;
    }
  }

  /**
   * Get a specific alert by ID
   */
  async getAlertById(alertId, userId) {
    try {
      const alert = await SOSAlert.findOne({ _id: alertId, userId });

      if (!alert) {
        const error = new Error("Alert not found");
        error.statusCode = 404;
        throw error;
      }

      const recipients = await AlertRecipient.find({ alertId }).select(
        "recipientType name email relationship delivered emailStatus emailSentAt",
      );

      const endTime = alert.resolvedAt || alert.cancelledAt || null;
      const durationMs = endTime
        ? Math.max(
            0,
            new Date(endTime).getTime() - new Date(alert.createdAt).getTime(),
          )
        : null;

      // Build response timeline from alert.timeline
      const responseTimeline = (alert.timeline || []).map((event) => ({
        event: event.event,
        status: event.status,
        timestamp: event.timestamp,
      }));

      return {
        id: alert._id,
        status: alert.status,
        timestamp: alert.createdAt,
        universityName: alert.universityName,
        locationLabel: alert.locationLabel,
        location: {
          latitude: alert.latitude,
          longitude: alert.longitude,
          available: alert.locationAvailable,
        },
        locationLink: alert.locationLink,
        durationMs,
        message: alert.message,

        // Response Timeline section
        responseTimeline,

        // Trusted Contacts section with delivery status
        contactsNotified: recipients.map((r) => ({
          type: r.recipientType,
          name: r.name,
          relationship: r.relationship,
          email: r.email,
          delivered: r.delivered,
          status: r.delivered ? "sent" : "failed",
          emailStatus: r.emailStatus,
          emailSentAt: r.emailSentAt,
        })),

        // Resolution Summary section
        resolutionSummary: endTime
          ? {
              startTime: alert.createdAt,
              endTime,
              durationMs,
              resolvedBy: alert.resolvedBy,
              resolutionReason: alert.resolutionReason,
            }
          : null,

        cancelledAt: alert.cancelledAt,
        cancellationReason: alert.cancellationReason,
        resolvedAt: alert.resolvedAt,
        resolvedBy: alert.resolvedBy,
        resolutionReason: alert.resolutionReason,
        canCancel: alert.canCancel(),
        cancellationTimeRemaining: alert.getCancellationTimeRemaining(),
      };
    } catch (error) {
      logger.error("Get alert error:", error);
      throw error;
    }
  }

  /**
   * Send user confirmation email for any status
   */
  async _sendUserConfirmation(userId, alert, status, additionalData = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const emailData = {
        alertId: alert._id,
        latitude: alert.latitude,
        longitude: alert.longitude,
        locationLink: alert.locationLink,
        timestamp: new Date().toISOString(),
        status: status,
        ...additionalData,
      };

      await emailService.sendSOSConfirmationToUser(userId, emailData);
    } catch (error) {
      logger.error(
        `Failed to send user confirmation for status ${status}:`,
        error,
      );
    }
  }
}

export default new SOSService();
