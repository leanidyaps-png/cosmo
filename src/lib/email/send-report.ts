import { google } from "googleapis";
import { marked } from "marked";
import nodemailer from "nodemailer";
import { Resend } from "resend";

function getGmailClient() {
  const user = process.env.GMAIL_USER;
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!user || !clientId || !clientSecret || !refreshToken) {
    console.warn(
      "[Cosmo Email] Gmail OAuth2 credentials not set"
    );
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return { gmail: google.gmail({ version: "v1", auth: oauth2Client }), user };
}

function getNodemailerTransport() {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (!user || !appPassword) {
    return null;
  }

  return {
    transport: nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user, pass: appPassword },
      tls: { rejectUnauthorized: false },
      // Force IPv4 — Railway containers may not support IPv6
      family: 4,
    } as nodemailer.TransportOptions),
    user,
  };
}

function buildMimeMessage(
  from: string,
  to: string,
  subject: string,
  html: string,
  text: string,
  attachmentContent: string,
  attachmentFilename: string
): string {
  const boundary = "cosmo_boundary_" + Date.now();
  const mixedBoundary = "cosmo_mixed_" + Date.now();

  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    ``,
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(text).toString("base64"),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(html).toString("base64"),
    ``,
    `--${boundary}--`,
    `--${mixedBoundary}`,
    `Content-Type: text/markdown; name="${attachmentFilename}"`,
    `Content-Disposition: attachment; filename="${attachmentFilename}"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(attachmentContent).toString("base64"),
    ``,
    `--${mixedBoundary}--`,
  ].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function markdownToHtml(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string;

  return `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1400px; margin: 0 auto; padding: 32px 40px; color: #1a1a1a; background: #ffffff; line-height: 1.6; }
  h1 { color: #0f172a; border-bottom: 3px solid #6366f1; padding-bottom: 12px; font-size: 24px; }
  h2 { color: #1e293b; margin-top: 32px; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
  h3 { color: #334155; margin-top: 24px; font-size: 16px; }
  h4 { color: #475569; margin-top: 20px; font-size: 14px; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 13px; }
  th { background: #f1f5f9; color: #334155; padding: 10px 12px; text-align: left; border: 1px solid #e2e8f0; font-weight: 600; }
  td { padding: 8px 12px; border: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: 'SF Mono', Monaco, monospace; }
  pre { background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; }
  pre code { background: none; color: inherit; padding: 0; }
  strong { color: #0f172a; }
  ul, ol { padding-left: 24px; }
  li { margin: 4px 0; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
  blockquote { border-left: 3px solid #6366f1; margin: 16px 0; padding: 8px 16px; background: #f8fafc; color: #475569; font-style: italic; }
  a { color: #6366f1; }
</style>
</head>
<body>
${rawHtml}
</body>
</html>`;
}

// ── Resend (primary when configured) ─────────────────────────────────────────
// Set RESEND_API_KEY and RESEND_FROM_EMAIL (e.g. "reports@yourdomain.com")
// You need to verify your domain in Resend dashboard first

async function sendViaResend(
  toEmail: string,
  subject: string,
  html: string,
  markdownReport: string,
  dateStr: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return { success: false, error: "Resend not configured (need RESEND_API_KEY + RESEND_FROM_EMAIL)" };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: `Cosmo Intelligence <${fromEmail}>`,
      to: [toEmail],
      subject,
      html,
      text: markdownReport,
      attachments: [
        {
          filename: `cosmo-report-${dateStr}.md`,
          content: Buffer.from(markdownReport).toString("base64"),
          contentType: "text/markdown",
        },
      ],
    });

    if (error) {
      console.warn(`[Cosmo Email] Resend failed for ${toEmail}: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`[Cosmo Email] Sent via Resend to ${toEmail}, ID: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Resend error";
    console.warn(`[Cosmo Email] Resend error for ${toEmail}: ${message}`);
    return { success: false, error: message };
  }
}

async function sendViaNodemailer(
  toEmail: string,
  subject: string,
  html: string,
  markdownReport: string,
  dateStr: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const nm = getNodemailerTransport();
  if (!nm) {
    return { success: false, error: "No email transport available (OAuth2 failed, no App Password set)" };
  }

  try {
    const info = await nm.transport.sendMail({
      from: `Cosmo Intelligence <${nm.user}>`,
      to: toEmail,
      subject,
      text: markdownReport,
      html,
      attachments: [
        {
          filename: `cosmo-report-${dateStr}.md`,
          content: markdownReport,
          contentType: "text/markdown",
        },
      ],
    });

    console.log(`[Cosmo Email] Sent via Nodemailer to ${toEmail}, ID: ${info.messageId}`);
    return { success: true, emailId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error(`[Cosmo Email] Nodemailer also failed for ${toEmail}:`, message);
    return { success: false, error: message };
  }
}

export async function sendDailyReportEmail(
  toEmail: string,
  markdownReport: string,
  recipientName?: string | null
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const dateStr = new Date().toISOString().split("T")[0];
  const preparedFor = recipientName || toEmail;
  const subject = `Cosmo AI Intelligence Report - Prepared for ${preparedFor} - ${dateStr}`;
  const html = markdownToHtml(markdownReport);

  // Priority 1: Resend (most reliable, needs domain verification)
  const resendResult = await sendViaResend(toEmail, subject, html, markdownReport, dateStr);
  if (resendResult.success) return resendResult;

  // Priority 2: Gmail OAuth2 API
  const client = getGmailClient();
  if (client) {
    const from = `Cosmo Intelligence <${client.user}>`;
    const raw = buildMimeMessage(
      from,
      toEmail,
      subject,
      html,
      markdownReport,
      markdownReport,
      `cosmo-report-${dateStr}.md`
    );

    try {
      const res = await client.gmail.users.messages.send({
        userId: "me",
        requestBody: { raw },
      });

      console.log(`[Cosmo Email] Sent via OAuth2 to ${toEmail}, ID: ${res.data.id}`);
      return { success: true, emailId: res.data.id ?? undefined };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown email error";
      console.warn(`[Cosmo Email] OAuth2 failed for ${toEmail}: ${message}`);
    }
  }

  // Priority 3: Nodemailer with App Password
  return sendViaNodemailer(toEmail, subject, html, markdownReport, dateStr);
}
