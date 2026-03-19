import { Resend } from "resend";
import { marked } from "marked";

let resend: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[Cosmo Email] RESEND_API_KEY not set, email disabled");
    return null;
  }

  if (!resend) {
    resend = new Resend(apiKey);
  }

  return resend;
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
  const client = getResend();

  if (!client) {
    return {
      success: false,
      error: "Resend not configured (RESEND_API_KEY missing)",
    };
  }

  const dateStr = new Date().toISOString().split("T")[0];
  const subject = `Cosmo AI Intelligence Report — 30 Models · 9 Categories — ${dateStr}`;
  const html = markdownToHtml(markdownReport);

  try {
    const { data, error } = await client.emails.send({
      from: "Cosmo Intelligence <onboarding@resend.dev>",
      to: toEmail,
      subject,
      html,
      text: markdownReport,
    });

    if (error) {
      console.error(`[Cosmo Email] Failed to send to ${toEmail}:`, error.message);
      return { success: false, error: error.message };
    }

    console.log(`[Cosmo Email] Sent to ${toEmail}, ID: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown email error";
    console.error(`[Cosmo Email] Failed to send to ${toEmail}:`, message);
    return { success: false, error: message };
  }
}
