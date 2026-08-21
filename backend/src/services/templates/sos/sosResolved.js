import { alertLayout } from "../shared/alertLayout.js";
import {
  detailRow,
  detailsBox,
  bulletBox,
  mapImageBlock,
  recipientsList,
  actionButton,
} from "../shared/components.js";
import { STATUS_THEME, BRAND } from "../shared/theme.js";

/**
 * Sent when an SOS alert has been resolved by the user themselves
 * (real emergency concluded safely).
 */
export function sosResolvedEmailTemplate({
  recipientName,
  userName,
  userPhone,
  userEmail,
  latitude,
  longitude,
  locationLink,
  locationLabel,
  contacts = [],
  alertId,
  timeTriggered,
  timeResolved,
  googleMapsApiKey,
}) {
  const theme = STATUS_THEME.cancelled;
  const displayName = userName || userPhone || "A user";
  const subject = `✅ SOS Alert Resolved - ${displayName} is Safe`;

  const locationUrl =
    locationLink ||
    (typeof latitude === "number" && typeof longitude === "number"
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : null);

  const detailsRows =
    detailRow("Time Triggered:", timeTriggered) +
    detailRow("Time Resolved:", timeResolved) +
    detailRow(
      "Last Known Location:",
      locationLabel ? `📍 ${locationLabel}` : null,
    ) +
    detailRow("Phone:", userPhone) +
    detailRow("Email:", userEmail, { last: true });

  const bodyHtml = `
    <p class="greeting">Hi ${recipientName || "there"},</p>
    <p class="lead">${displayName} has resolved their recent SOS alert and marked their status as safe. No further emergency action is required.</p>

    ${bulletBox({
      title: "Current Status:",
      boxBg: theme.boxBg,
      boxText: theme.boxText,
      items: [
        "No further emergency action is required on your part.",
        "Live location tracking has been disabled to protect their privacy.",
        `We recommend following up with ${displayName} directly to ensure everything is okay.`,
      ],
    })}

    <h4 class="section-heading">Alert Details</h4>
    ${detailsBox(null, detailsRows)}

    <h4 class="section-heading">Last Known Location</h4>
    ${mapImageBlock({ latitude, longitude, googleMapsApiKey })}
    ${locationUrl ? `<div style="text-align:center;">${actionButton(locationUrl, "Open Last Known Location", { bg: theme.buttonBg })}</div>` : ""}

    ${recipientsList(contacts)}

    <h4 class="section-heading">Need to check in?</h4>
    <p class="lead">Consider reaching out to ${displayName} to ensure they are okay, especially if you were unable to contact them during the emergency.</p>
  `;

  const html = alertLayout({
    headerBg: theme.headerBg,
    headerIcon: "✅",
    headerTitle: "SOS ALERT RESOLVED",
    headerSubtitle: "This SOS alert was resolved by the user",
    pillLabel: "SOS ALERT RESOLVED",
    pillBg: theme.pillBg,
    pillText: theme.pillText,
    bodyHtml,
    extraCSS: `.section-heading { margin: 22px 0 8px; color: #333; font-size: 15px; }`,
  });

  const text = `
✅ SOS ALERT RESOLVED
This SOS alert was resolved by the user

Hi ${recipientName || "there"},

${displayName} has resolved their recent SOS alert and marked their status as safe. No further emergency action is required.

Time Triggered: ${timeTriggered || "N/A"}
Time Resolved: ${timeResolved || "N/A"}
${locationLabel ? `Last Known Location: ${locationLabel}` : ""}
${userPhone ? `Phone: ${userPhone}` : ""}
${userEmail ? `Email: ${userEmail}` : ""}

Location: ${locationUrl || "Location not available"}

This alert was sent to:
${contacts.map((c) => `- ${c.name} (${c.relationship || c.type || "Contact"})`).join("\n")}

Need to check in? Consider reaching out to ${displayName} directly, especially if you were unable to contact them during the emergency.

---
${BRAND.name} - Emergency Alert System
Alert ID: ${alertId || "N/A"}
This is an automated message. Please do not reply.
  `.trim();

  return { subject, html, text };
}
