import { alertLayout } from "../shared/alertLayout.js";
import {
  detailRow,
  detailsBox,
  mapImageBlock,
  actionButton,
} from "../shared/components.js";
import { STATUS_THEME, BRAND } from "../shared/theme.js";

/**
 * Lookup used by _buildTextVersion to avoid a nested ternary.
 */
const STATUS_TEXT_HEADLINES = {
  Active: "🚨 SOS ALERT CONFIRMATION - Help is on the way!",
  "False Alarm": "⚠️ FALSE ALARM CONFIRMED",
  Cancelled: "✅ SOS ALERT CANCELLED - You're Safe!",
  Resolved: "✅ SOS ALERT RESOLVED - You're Safe!",
};

/**
 * Config for the "resolved" status. Split out of _getConfirmationConfig
 * to keep that function's cognitive complexity low.
 */
function _getResolvedConfig({ userName, resolvedBy, resolutionReason }) {
  const theme = STATUS_THEME.cancelled;
  const resolvedBySuffix = resolvedBy ? ` by ${resolvedBy}` : "";

  let boxSubtitle = "The emergency has been handled and you are safe.";
  if (resolvedBy) {
    boxSubtitle = `Resolved by: ${resolvedBy}`;
    if (resolutionReason) {
      boxSubtitle += ` - ${resolutionReason}`;
    }
  }

  return {
    theme,
    subject: `✅ SOS Alert Resolved - You're Safe, ${userName || "User"}!`,
    headerTitle: "SOS Alert Resolved",
    headerSubtitle: `Your SOS alert has been resolved${resolvedBySuffix}`,
    pillLabel: "✅ RESOLVED",
    headerIcon: "✅",
    headerBg: theme.headerBg,
    pillBg: theme.pillBg,
    pillText: theme.pillText,
    boxTitle: "✅ Alert Resolved Successfully",
    boxSubtitle,
    statusText: "Resolved",
    confirmationText: "✅ The emergency has been resolved and you are safe.",
    actionButtonText: "📞 Need Help? Call Emergency",
    actionButtonBg: "#4CAF50",
    boxBg: "#e8f5e9",
    boxBorder: "#c8e6c9",
    boxTitleColor: "#2e7d32",
    recipientBadge: "ℹ️ Notified",
  };
}

/**
 * Config for the "false alarm" status.
 */
function _getFalseAlarmConfig({ userName }) {
  const theme = STATUS_THEME.false_alarm;
  return {
    theme,
    subject: `⚠️ False Alarm Confirmed - ${userName || "User"}`,
    headerTitle: "False Alarm Confirmed",
    headerSubtitle: "Your SOS alert has been marked as a false alarm",
    pillLabel: "⚠️ FALSE ALARM",
    headerIcon: "⚠️",
    headerBg: theme.headerBg,
    pillBg: theme.pillBg,
    pillText: theme.pillText,
    boxTitle: "⚠️ False Alarm Confirmed",
    boxSubtitle:
      "Your SOS alert has been cancelled as a false alarm. No emergency took place.",
    statusText: "False Alarm",
    confirmationText: "⚠️ This was confirmed as a false alarm.",
    actionButtonText: "📞 Call Emergency If Needed",
    actionButtonBg: "#FF9800",
    boxBg: "#fff3e0",
    boxBorder: "#ffccbc",
    boxTitleColor: "#e65100",
    recipientBadge: "ℹ️ Notified",
  };
}

/**
 * Config for the "cancelled" status.
 */
function _getCancelledConfig({ userName, cancellationReason }) {
  const theme = STATUS_THEME.cancelled;
  return {
    theme,
    subject: `✅ SOS Alert Cancelled - You're Safe, ${userName || "User"}`,
    headerTitle: "SOS Alert Cancelled",
    headerSubtitle: "Your SOS alert has been successfully cancelled",
    pillLabel: "✅ CANCELLED",
    headerIcon: "✅",
    headerBg: theme.headerBg,
    pillBg: theme.pillBg,
    pillText: theme.pillText,
    boxTitle: "✅ Alert Cancelled Successfully",
    boxSubtitle: cancellationReason
      ? `Reason: ${cancellationReason}`
      : "Your emergency contacts have been notified that you are safe.",
    statusText: "Cancelled",
    confirmationText:
      "✅ You have cancelled the alert and confirmed you are safe.",
    actionButtonText: "📞 Call Emergency If Needed",
    actionButtonBg: "#4CAF50",
    boxBg: "#e8f5e9",
    boxBorder: "#c8e6c9",
    boxTitleColor: "#2e7d32",
    recipientBadge: "ℹ️ Notified",
  };
}

/**
 * Config for the default "active/triggered" status.
 */
function _getActiveConfig({ userName }) {
  const theme = STATUS_THEME.active;
  return {
    theme,
    subject: `🚨 SOS Alert Confirmation - Help is on the way, ${userName || "User"}!`,
    headerTitle: "SOS Alert Sent",
    headerSubtitle: "Help is on the way! Your alert has been dispatched.",
    pillLabel: "🚨 ALERT SENT",
    headerIcon: "🚨",
    headerBg: theme.headerBg,
    pillBg: theme.pillBg,
    pillText: theme.pillText,
    boxTitle: "🚨 Alert Sent Successfully",
    boxSubtitle: "Your emergency contacts have been notified.",
    statusText: "Active",
    confirmationText:
      "⚠️ False Alarm? If this was a mistake, you can cancel the alert from the app within 5 minutes.",
    actionButtonText: "📞 Call Emergency",
    actionButtonBg: "#4CAF50",
    boxBg: "#e8f5e9",
    boxBorder: "#c8e6c9",
    boxTitleColor: "#2e7d32",
    recipientBadge: "✅ Notified",
  };
}

/**
 * Determine the theme and configuration based on the status.
 * Kept as a simple dispatcher (early returns, no nested branching)
 * so its cognitive complexity stays low; the per-status logic lives
 * in the _get*Config helpers above.
 */
function _getConfirmationConfig({
  userName,
  status,
  isCancellation,
  isResolution,
  resolvedBy,
  resolutionReason,
  cancellationReason,
}) {
  if (isResolution) {
    return _getResolvedConfig({ userName, resolvedBy, resolutionReason });
  }
  if (isCancellation && status === "false_alarm") {
    return _getFalseAlarmConfig({ userName });
  }
  if (isCancellation) {
    return _getCancelledConfig({ userName, cancellationReason });
  }
  return _getActiveConfig({ userName });
}

/**
 * Build the status-specific detail rows (resolved/false-alarm/cancelled/active).
 */
function _buildStatusDetailRows({
  status,
  isResolution,
  isCancellation,
  resolvedBy,
  resolutionReason,
  cancellationReason,
}) {
  if (isResolution) {
    return (
      detailRow("Status:", "Resolved") +
      (resolvedBy ? detailRow("Resolved By:", resolvedBy) : "") +
      (resolutionReason ? detailRow("Reason:", resolutionReason) : "")
    );
  }
  if (isCancellation && status === "false_alarm") {
    return (
      detailRow("Status:", "False Alarm") +
      (cancellationReason ? detailRow("Reason:", cancellationReason) : "")
    );
  }
  if (isCancellation) {
    return (
      detailRow("Status:", "Cancelled") +
      (cancellationReason ? detailRow("Reason:", cancellationReason) : "")
    );
  }
  return detailRow("Status:", "Active");
}

/**
 * Build details rows based on status
 */
function _buildDetailsRows({
  alertId,
  timestamp,
  message,
  status,
  isResolution,
  isCancellation,
  resolvedBy,
  resolutionReason,
  cancellationReason,
  latitude,
  longitude,
}) {
  let rows =
    detailRow("Alert ID:", alertId) +
    detailRow("Time:", timestamp || new Date().toLocaleString()) +
    (message ? detailRow("Your Message:", `"${message}"`) : "");

  rows += _buildStatusDetailRows({
    status,
    isResolution,
    isCancellation,
    resolvedBy,
    resolutionReason,
    cancellationReason,
  });

  rows += detailRow(
    "Coordinates:",
    latitude && longitude ? `${latitude}, ${longitude}` : null,
    { last: true },
  );

  return rows;
}

/**
 * Build status message box HTML
 */
function _buildStatusMessageBox(config) {
  return `
    <div class="confirm-box" style="background-color: ${config.boxBg}; border-color: ${config.boxBorder};">
      <span class="big-check">${config.headerIcon}</span>
      <h3 class="confirm-title" style="color: ${config.boxTitleColor};">${config.boxTitle}</h3>
      <p class="confirm-sub">${config.boxSubtitle}</p>
    </div>
  `;
}

/**
 * Build action HTML based on status
 */
function _buildActionHtml(config, userPhone) {
  if (config.statusText === "Active") {
    return `
      <div class="false-alarm-box">
        <p><strong>⚠️ False Alarm?</strong> If this was a mistake, you can cancel the alert from the app within 5 minutes.</p>
      </div>
      <div class="actions">
        ${userPhone ? actionButton(`tel:${userPhone}`, config.actionButtonText, { bg: config.actionButtonBg }) : ""}
      </div>
    `;
  }

  return `
    <div class="actions">
      ${userPhone ? actionButton(`tel:${userPhone}`, config.actionButtonText, { bg: config.actionButtonBg }) : ""}
    </div>
  `;
}

/**
 * Build text version.
 * Takes a single options object (instead of 8 positional params) to
 * satisfy the max-params rule, and uses a lookup map instead of a
 * nested ternary to pick the headline.
 */
function _buildTextVersion({
  config,
  alertId,
  timestamp,
  message,
  locationUrl,
  resolvedBy,
  resolutionReason,
  cancellationReason,
}) {
  const textMessage =
    STATUS_TEXT_HEADLINES[config.statusText] || STATUS_TEXT_HEADLINES.Resolved;

  return `
${textMessage}

Alert ID: ${alertId || "N/A"}
Time: ${timestamp || new Date().toLocaleString()}
${message ? `Message: "${message}"` : ""}
Status: ${config.statusText}
${resolvedBy ? `Resolved By: ${resolvedBy}` : ""}
${resolutionReason ? `Reason: ${resolutionReason}` : ""}
${cancellationReason ? `Reason: ${cancellationReason}` : ""}

Location: ${locationUrl || "Location not available"}

This alert has been sent to:
✅ University Security
✅ Emergency Directory
✅ Your Trusted Contacts

${config.confirmationText}

---
${BRAND.name} - Emergency Alert System
This is an automated message. Please do not reply.
  `.trim();
}

/**
 * Sent to the user themselves after:
 * - Triggering an SOS alert (confirmation)
 * - Cancelling an SOS alert (confirmation)
 * - Marking as false alarm (confirmation)
 * - Resolving an SOS alert (confirmation)
 */
export function sosConfirmationEmailTemplate({
  userName,
  userPhone,
  latitude,
  longitude,
  locationLink,
  alertId,
  timestamp,
  message,
  googleMapsApiKey,
  // New params for different statuses
  status = "sent",
  isCancellation = false,
  isResolution = false,
  resolvedBy,
  resolutionReason,
  cancellationReason,
}) {
  // Get configuration based on status
  const config = _getConfirmationConfig({
    userName,
    status,
    isCancellation,
    isResolution,
    resolvedBy,
    resolutionReason,
    cancellationReason,
  });

  const locationUrl =
    locationLink ||
    (typeof latitude === "number" && typeof longitude === "number"
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : null);

  // Build details rows
  const detailsRows = _buildDetailsRows({
    alertId,
    timestamp,
    message,
    status,
    isResolution,
    isCancellation,
    resolvedBy,
    resolutionReason,
    cancellationReason,
    latitude,
    longitude,
  });

  // Build status message
  const statusMessageHtml = _buildStatusMessageBox(config);

  // Build action HTML
  const actionHtml = _buildActionHtml(config, userPhone);

  const bodyHtml = `
    ${statusMessageHtml}

    <h4 class="section-heading">Alert Details</h4>
    ${detailsBox(null, detailsRows)}

    <h4 class="section-heading">Your Location</h4>
    ${mapImageBlock({ latitude, longitude, googleMapsApiKey })}
    ${locationUrl ? `<div style="text-align:center;">${actionButton(locationUrl, "📍 View on Google Maps", { bg: "#4CAF50" })}</div>` : ""}

    <h4 class="section-heading">Alert Recipients</h4>
    <div class="recipients-box">
      <div class="recipient-row"><strong>University Security</strong><span class="status-badge">${config.recipientBadge}</span></div>
      <div class="recipient-row"><strong>Emergency Directory</strong><span class="status-badge">${config.recipientBadge}</span></div>
      <div class="recipient-row"><strong>Your Trusted Contacts</strong><span class="status-badge">${config.recipientBadge}</span></div>
    </div>

    ${actionHtml}
  `;

  const html = alertLayout({
    headerBg: config.headerBg,
    headerIcon: config.headerIcon,
    headerTitle: config.headerTitle,
    headerSubtitle: config.headerSubtitle,
    pillLabel: config.pillLabel,
    pillBg: config.pillBg,
    pillText: config.pillText,
    bodyHtml,
    extraCSS: `
      .section-heading { margin: 22px 0 8px; color: #333; font-size: 15px; }
      .confirm-box { padding: 20px; border-radius: 8px; margin: 4px 0 20px; text-align: center; border: 1px solid; }
      .big-check { font-size: 44px; display: block; }
      .confirm-title { margin: 10px 0 5px; }
      .confirm-sub { margin: 0; color: #555; }
      .recipients-box { background: #f8f9fa; padding: 4px 15px; border-radius: 8px; margin: 12px 0 20px; }
      .recipient-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
      .recipient-row:last-child { border-bottom: none; }
      .status-badge { display: inline-block; background: #4CAF50; color: #fff; padding: 2px 10px; border-radius: 12px; font-size: 12px; }
      .false-alarm-box { background: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; border-radius: 4px; margin: 20px 0; color: #856404; }
      .actions { margin-top: 20px; }
    `,
  });

  const text = _buildTextVersion({
    config,
    alertId,
    timestamp,
    message,
    locationUrl,
    resolvedBy,
    resolutionReason,
    cancellationReason,
  });

  return { subject: config.subject, html, text };
}
