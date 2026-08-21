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
 * Sent when the user who triggered an SOS alert cancels it themselves,
 * confirming it was triggered by mistake. Location tracking has already
 * ended by this point, so the map shows a "tracking has ended" overlay
 * instead of a live-location button (mirrors the False Alarm template).
 *
 * NOTE: the reference design has a blue header, distinct from the green
 * "resolved" header that also currently comes from STATUS_THEME.cancelled.
 * If shared/theme.js only has one "cancelled" entry, add a dedicated
 * theme (e.g. STATUS_THEME.cancelled_by_user) and swap it in below.
 */
export function sosCancelledEmailTemplate({
  recipientName,
  userName,
  userPhone,
  userEmail,
  latitude,
  longitude,
  locationLabel,
  contacts = [],
  alertId,
  timeTriggered,
  timeCancelled,
  googleMapsApiKey,
}) {
  const theme = STATUS_THEME.cancelled;
  const displayName = userName || userPhone || "A user";
  const subject = `✅ SOS Alert Cancelled by ${displayName}`;

  const detailsRows =
    detailRow("Time Triggered:", timeTriggered) +
    detailRow("Time Cancelled:", timeCancelled) +
    detailRow(
      "Location at Trigger:",
      locationLabel ? `📍 ${locationLabel}` : null,
    ) +
    detailRow("Phone:", userPhone) +
    detailRow("Email:", userEmail, { last: true });

  const overlayHtml = `
    <p class="overlay-title">📍 ${locationLabel || "Last known location"}</p>
    <p class="overlay-text">Location tracking has ended — no live data available.</p>
  `;

  const bodyHtml = `
    <p class="greeting">Hi ${recipientName || "there"},</p>
    <p class="lead">${displayName} has cancelled their recent SOS alert via ${BRAND.name}. The alert was triggered by mistake and has been cancelled by the user. No emergency occurred and no action is required on your part.</p>

    ${bulletBox({
      title: "What This Means:",
      boxBg: theme.boxBg,
      boxText: theme.boxText,
      items: [
        `No emergency occurred — ${displayName} cancelled the SOS alert themselves.`,
        `${displayName} has confirmed they are safe and no assistance is needed.`,
        "Live location tracking has been disabled to protect their privacy.",
        "No further action is required on your part.",
      ],
    })}

    <h4 class="section-heading">Alert Details</h4>
    ${detailsBox(null, detailsRows)}

    <h4 class="section-heading">Location at Time of Trigger</h4>
    ${mapImageBlock({ latitude, longitude, googleMapsApiKey, overlay: overlayHtml })}
    <div style="text-align:center;">${actionButton("#", "Location Tracking Disabled", { disabled: true })}</div>

    ${recipientsList(contacts)}

    <h4 class="section-heading">All clear — no action needed.</h4>
    <p class="lead">You can disregard the earlier alert. The user has confirmed they triggered it by mistake. No emergency occurred.</p>
  `;

  const html = alertLayout({
    headerBg: theme.headerBg,
    headerIcon: "🔔",
    headerTitle: "ALERT CANCELLED",
    headerSubtitle: "This alert was cancelled by the user",
    pillLabel: "ALERT CANCELLED BY USER",
    pillBg: theme.pillBg,
    pillText: theme.pillText,
    bodyHtml,
    extraCSS: `
      .section-heading { margin: 22px 0 8px; color: #333; font-size: 15px; }
      .overlay-title { margin: 0 0 4px; font-weight: 700; color: ${theme.boxText}; }
      .overlay-text { margin: 0; font-size: 13px; color: ${theme.boxText}; }
    `,
  });

  const text = `
🔔 ALERT CANCELLED
This alert was cancelled by the user

Hi ${recipientName || "there"},

${displayName} has cancelled their recent SOS alert via ${BRAND.name}. The alert was triggered by mistake and has been cancelled by the user. No emergency occurred and no action is required on your part.

Time Triggered: ${timeTriggered || "N/A"}
Time Cancelled: ${timeCancelled || "N/A"}
${locationLabel ? `Location at Trigger: ${locationLabel}` : ""}
${userPhone ? `Phone: ${userPhone}` : ""}
${userEmail ? `Email: ${userEmail}` : ""}

Location tracking has ended — no live data available.

This alert was sent to:
${contacts.map((c) => `- ${c.name} (${c.relationship || c.type || "Contact"})`).join("\n")}

All clear — no action needed. You can disregard the earlier alert.

---
${BRAND.name} - Emergency Alert System
Alert ID: ${alertId || "N/A"}
This is an automated message. Please do not reply.
  `.trim();

  return { subject, html, text };
}
