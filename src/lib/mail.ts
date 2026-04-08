import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string, attachments?: any[]) => {
  console.log(`[EMAIL_MOCK] Sending email to ${to} with subject: ${subject}`);
  // Log the first link found in the HTML for easy access during development
  const linkMatch = html.match(/href="([^"]+)"/);
  if (linkMatch) {
    console.log(`[EMAIL_MOCK] Link found: ${linkMatch[1]}`);
  }

  try {
    const info = await transporter.sendMail({
      from: `"Measles Platform" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments,
    });
    console.log("Email sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.warn("Email sending failed. This is expected if SMTP credentials are not set. Check console for links.");
    return { mock: true, messageId: "mock-id" };
  }
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationLink = `${process.env.NEXTAUTH_URL}/api/auth/verify?token=${token}`;
  const html = `
    <h1>Verify your email</h1>
    <p>Please click the link below to verify your email address and complete your registration:</p>
    <a href="${verificationLink}">${verificationLink}</a>
  `;
  await sendEmail(email, "Verify your email - Measles Platform", html);
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
  const html = `
    <h1>Reset your password</h1>
    <p>Please click the link below to reset your password:</p>
    <a href="${resetLink}">${resetLink}</a>
  `;
  await sendEmail(email, "Reset your password - Measles Platform", html);
};
