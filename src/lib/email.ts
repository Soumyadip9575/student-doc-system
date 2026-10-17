import { sendEmail } from "./mailer";

export type Attachment = { filename: string; content: Buffer };

export async function sendDocs(to: string, files: Attachment[]): Promise<void> {
  if (process.env.DEMO_MODE === "true") return; // no real email in demo mode
  await sendEmail({
    to,
    subject: "Student Documents – University Submission",
    text: "Dear Sir/Madam,\n\nPlease find attached the generated student document(s) based on the latest university response data.\n\nThis email was generated automatically by the University Student Document Distribution System.\n\nRegards,\nUniversity Administration",
    attachments: files,
  });
}

export async function sendFormInvites(recipients: string[], formTitle: string, formUrl: string) {
  const demo = process.env.DEMO_MODE === "true";
  const sent: string[] = [];
  const failed: string[] = [];
  const subject = `You have been invited to complete ${formTitle}`;
  const text = [
    `You have been given access to the form "${formTitle}".`,
    "",
    "Steps to complete the form:",
    "1. Open the form link below.",
    "2. Register or sign in using the email address that received this invitation.",
    "3. Open User Panel in the left navigation.",
    `4. Select "${formTitle}" and fill in the requested information.`,
    "5. Select Submit response. You can return to the User Panel to submit another response if needed.",
    "",
    `Open your form: ${formUrl}`,
    "",
    "This link is restricted to the invited email address.",
  ].join("\n");

  if (demo) {
    for (const to of recipients) {
      console.log(`[DEMO ONLY] Form invitation for ${to}:\n${text}`);
      sent.push(to);
    }
    return { sent, failed, demo };
  }

  for (let index = 0; index < recipients.length; index += 5) {
    const batch = recipients.slice(index, index + 5);
    const results = await Promise.all(batch.map(async (to) => {
      try {
        await sendEmail({ to, subject, text });
        return { to, sent: true };
      } catch {
        return { to, sent: false };
      }
    }));
    for (const result of results) {
      (result.sent ? sent : failed).push(result.to);
    }
  }

  return { sent, failed, demo };
}

export async function sendAdminAssignment(to: string, adminId: string, loginUrl: string) {
  const text = [
    "An existing administrator assigned you access to the University Admin Panel.",
    "",
    `Your five-digit Admin ID is: ${adminId}`,
    "",
    "To sign in:",
    `1. Open the university portal: ${loginUrl}`,
    "2. Enter this email address and your Admin ID.",
    "3. Request the separate one-time sign-in code sent to this email.",
    "4. Enter that code to open the Admin Panel.",
    "",
    "Keep your Admin ID private.",
  ].join("\n");
  if (process.env.DEMO_MODE === "true") {
    console.log(`[DEMO ONLY] Admin assignment for ${to}:\n${text}`);
    return { sent: true, demo: true };
  }

  try {
    await sendEmail({ to, subject: "Your University Admin Panel ID", text });
    return { sent: true, demo: false };
  } catch {
    return { sent: false, demo: false };
  }
}
