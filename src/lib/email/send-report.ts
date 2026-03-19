import nodemailer from "nodemailer";
import { marked } from "marked";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const user = process.env.GMAIL_USER;
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!user || !clientId || !clientSecret || !refreshToken) {
    console.warn(
      "[Cosmo Email] Gmail OAuth2 credentials not set, email disabled"
    );
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user,
        clientId,
        clientSecret,
        refreshToken,
      },
    });
  }

  return transporter;
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

export async function sendDailyReportEmail(
  toEmail: string,
  markdownReport: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const transport = getTransporter();

  if (!transport) {
    return {
      success: false,
      error: "Gmail OAuth2 not configured",
    };
  }

  const dateStr = new Date().toISOString().split("T")[0];
  const subject = `Cosmo AI Intelligence Report — 30 Models · 9 Categories — ${dateStr}`;
  const html = markdownToHtml(markdownReport);

  try {
    const info = await transport.sendMail({
      from: `Cosmo Intelligence <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject,
      html,
      text: markdownReport,
      attachments: [
        {
          filename: `cosmo-report-${dateStr}.md`,
          content: markdownReport,
          contentType: "text/markdown",
        },
      ],
    });

    console.log(`[Cosmo Email] Sent to ${toEmail}, ID: ${info.messageId}`);
    return { success: true, emailId: info.messageId };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown email error";
    console.error(`[Cosmo Email] Failed to send to ${toEmail}:`, message);
    return { success: false, error: message };
  }
}
