"use server";
import { headers } from "next/headers";
import { Resend } from "resend";
import {
  type ContactData,
  type ContactResult,
  normalizeContactData,
  validateContactData,
} from "@/lib/contact";
import { SITE } from "@/lib/site";

const DEFAULT_FROM = "Portfolio Contact <onboarding@resend.dev>";
// Telegram rejects messages over 4096 characters; leave room for the header
// lines and for HTML escaping, which makes the text longer.
const TELEGRAM_MESSAGE_PREVIEW = 3000;

// Best-effort rate limit, kept in memory. Each serverless instance keeps its
// own counts, so this slows down casual spam but is not a hard guarantee.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const recentSubmissions = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (recentSubmissions.get(key) ?? []).filter(
    (time) => now - time < RATE_LIMIT_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT_MAX) {
    recentSubmissions.set(key, recent);
    return true;
  }

  recent.push(now);
  recentSubmissions.set(key, recent);

  // Keep the map from growing forever on a long-lived instance.
  if (recentSubmissions.size > 1000) {
    for (const [ip, times] of recentSubmissions) {
      if (times.every((time) => now - time >= RATE_LIMIT_WINDOW_MS)) {
        recentSubmissions.delete(ip);
      }
    }
  }
  return false;
}

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "unknown"
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendToTelegram(data: ContactData): Promise<boolean> {
  const botToken = process.env.BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error("[contact] BOT_TOKEN or TELEGRAM_CHAT_ID is missing.");
    return false;
  }

  const preview =
    data.description.length > TELEGRAM_MESSAGE_PREVIEW
      ? `${data.description.slice(0, TELEGRAM_MESSAGE_PREVIEW)}… (truncated, full text in email)`
      : data.description;

  // HTML parse mode with escaped input. Markdown mode rejected any message
  // containing an unmatched _ or * (e.g. "john_doe@gmail.com").
  const message = [
    "<b>New Contact Message</b> 📬",
    `<b>Name:</b> ${escapeHtml(data.full_name)}`,
    `<b>Email:</b> ${escapeHtml(data.email)}`,
    `<b>Country:</b> ${escapeHtml(data.country)}`,
    `<b>Subject:</b> ${escapeHtml(data.subject)}`,
    "",
    "<b>Message:</b>",
    escapeHtml(preview),
  ].join("\n");

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    const body = (await res.json().catch(() => null)) as {
      ok?: boolean;
      description?: string;
    } | null;

    if (!res.ok || !body?.ok) {
      console.error(
        "[contact] Telegram rejected the message:",
        res.status,
        body?.description,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("[contact] Failed to reach Telegram:", error);
    return false;
  }
}

async function sendEmail(data: ContactData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_RECEIVER_EMAIL;

  if (!apiKey || !to) {
    console.error("[contact] RESEND_API_KEY or CONTACT_RECEIVER_EMAIL is missing.");
    return false;
  }

  const name = escapeHtml(data.full_name);
  const email = escapeHtml(data.email);

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
      <h2 style="color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-top: 0;">
        New Contact Submission
      </h2>
      <div style="margin-bottom: 20px;">
        <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #0070f3;">${email}</a></p>
        <p style="margin: 5px 0;"><strong>Country:</strong> ${escapeHtml(data.country)}</p>
        <p style="margin: 5px 0;"><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>
      </div>
      <h3 style="color: #555; font-size: 16px;">Message:</h3>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; color: #444; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(data.description)}</div>
      <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
        Sent via your portfolio contact form.
      </p>
    </div>
  `;

  const text = [
    `Name: ${data.full_name}`,
    `Email: ${data.email}`,
    `Country: ${data.country}`,
    `Subject: ${data.subject}`,
    "",
    data.description,
  ].join("\n");

  try {
    // Resend reports failures in the returned `error` instead of throwing.
    const { error } = await new Resend(apiKey).emails.send({
      from: process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM,
      to: [to],
      subject: `[Portfolio] ${data.subject} (from ${data.full_name})`,
      replyTo: data.email,
      html,
      text,
    });

    if (error) {
      console.error("[contact] Resend rejected the email:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[contact] Failed to reach Resend:", error);
    return false;
  }
}

export async function sendMainAction(input: unknown): Promise<ContactResult> {
  const data = normalizeContactData(input);

  // Honeypot: pretend it worked so bots don't learn to skip the field.
  if (data.company) {
    return { success: true };
  }

  const validationError = validateContactData(data);
  if (validationError) {
    return { success: false, error: validationError };
  }

  if (isRateLimited(await getClientIp())) {
    return {
      success: false,
      error: "Too many messages in a short time. Please try again later.",
    };
  }

  const [telegramSent, emailSent] = await Promise.all([
    sendToTelegram(data),
    sendEmail(data),
  ]);

  // One working channel is enough for the message to reach me.
  if (!telegramSent && !emailSent) {
    return {
      success: false,
      error: `Your message couldn't be delivered. Please email me directly at ${SITE.author.email}.`,
    };
  }

  return { success: true };
}
