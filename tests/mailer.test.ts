import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "../src/lib/mailer";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("sendEmail", () => {
  it("sends the verified sender and attachments through the transactional email API", async () => {
    vi.stubEnv("BREVO_API_KEY", "test-api-key");
    vi.stubEnv("EMAIL_FROM", '"University Administration" <admin@example.edu>');
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({
      to: "student@example.edu",
      subject: "Documents",
      text: "Your document is attached.",
      attachments: [{ filename: "document.pdf", content: Buffer.from("pdf") }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(request?.headers).toMatchObject({ "api-key": "test-api-key" });
    expect(JSON.parse(String(request?.body))).toMatchObject({
      sender: { name: "University Administration", email: "admin@example.edu" },
      to: [{ email: "student@example.edu" }],
      subject: "Documents",
      textContent: "Your document is attached.",
      attachment: [{ name: "document.pdf", content: Buffer.from("pdf").toString("base64") }],
    });
  });

  it("reports a rejected email request", async () => {
    vi.stubEnv("BREVO_API_KEY", "test-api-key");
    vi.stubEnv("EMAIL_FROM", "admin@example.edu");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(sendEmail({ to: "student@example.edu", subject: "Code", text: "123456" }))
      .rejects.toThrow("Email provider rejected the message (HTTP 401).");
  });
});
