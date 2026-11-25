// Shared by the contact form (client) and the send action (server) so both
// enforce the same rules. The server must never trust what the client sent.

export interface ContactData {
  full_name: string;
  email: string;
  country: string;
  /** Honeypot: hidden from people, so only bots fill it in. */
  company: string;
  subject: string;
  description: string;
}

export type ContactField = keyof ContactData;

export type ContactResult = { success: true } | { success: false; error: string };

export const CONTACT_LIMITS: Record<ContactField, number> = {
  full_name: 100,
  email: 254,
  country: 80,
  company: 100,
  subject: 150,
  description: 5000,
};

const FIELD_LABELS: Record<ContactField, string> = {
  full_name: "Full name",
  email: "Email",
  country: "Country",
  company: "Company",
  subject: "Subject",
  description: "Description",
};

const REQUIRED_FIELDS: ContactField[] = [
  "full_name",
  "email",
  "country",
  "subject",
  "description",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMPTY_CONTACT: ContactData = {
  full_name: "",
  email: "",
  country: "",
  company: "",
  subject: "",
  description: "",
};

/**
 * Coerces untrusted input into ContactData: non-strings become "", values are
 * trimmed, and line breaks are collapsed in single-line fields so they can't
 * smuggle extra lines into the email subject or notification.
 */
export function normalizeContactData(input: unknown): ContactData {
  const record =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};

  const text = (key: ContactField) => {
    const value = record[key];
    return typeof value === "string" ? value.trim() : "";
  };
  const singleLine = (key: ContactField) => text(key).replace(/\s+/g, " ");

  return {
    full_name: singleLine("full_name"),
    email: singleLine("email"),
    country: singleLine("country"),
    company: singleLine("company"),
    subject: singleLine("subject"),
    description: text("description"),
  };
}

/** Returns a message for the first problem found, or null when valid. */
export function validateContactData(data: ContactData): string | null {
  if (REQUIRED_FIELDS.some((key) => !data[key])) {
    return "Please fill in all required fields.";
  }

  for (const key of Object.keys(CONTACT_LIMITS) as ContactField[]) {
    if (data[key].length > CONTACT_LIMITS[key]) {
      return `${FIELD_LABELS[key]} is too long (max ${CONTACT_LIMITS[key]} characters).`;
    }
  }

  if (!EMAIL_PATTERN.test(data.email)) {
    return "Please enter a valid email address.";
  }

  return null;
}
