export type EmailAttachment = { filename: string; content: Buffer };

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
};

function getSender() {
  const configured = process.env.EMAIL_FROM?.trim();
  if (!configured) throw new Error("EMAIL_FROM is not configured.");

  const formatted = configured.match(/^(.*?)\s*<([^<>]+)>$/);
  const email = formatted ? formatted[2].trim() : configured;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("EMAIL_FROM must be a valid verified sender email address.");
  }
  return { email, ...(formatted?.[1].trim() ? { name: formatted[1].trim().replace(/^["']|["']$/g, "") } : {}) };
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not configured.");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: getSender(),
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.text,
      ...(message.attachments?.length
        ? {
            attachment: message.attachments.map((attachment) => ({
              name: attachment.filename,
              content: attachment.content.toString("base64"),
            })),
          }
        : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Email provider rejected the message (HTTP ${response.status}).`);
  }
}
