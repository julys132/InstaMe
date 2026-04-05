type TransactionalEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function getEmailApiKey(): string {
  return process.env.RESEND_API_KEY?.trim() || "";
}

function getEmailFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    process.env.FROM_EMAIL?.trim() ||
    ""
  );
}

export function isTransactionalEmailConfigured(): boolean {
  return Boolean(getEmailApiKey() && getEmailFromAddress());
}

export async function sendTransactionalEmail(payload: TransactionalEmailPayload): Promise<void> {
  const apiKey = getEmailApiKey();
  const from = getEmailFromAddress();

  if (!apiKey || !from) {
    throw new Error("Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email provider error (${response.status}): ${details || "Unknown error"}`);
  }
}