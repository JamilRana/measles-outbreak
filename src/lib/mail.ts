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
  try {
    const info = await transporter.sendMail({
      from: `"Measles Platform" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments,
    });
    return info;
  } catch (error) {
    console.error("Email sending failed:", error);
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

export const sendUserCreatedEmail = async (email: string, password: string, facilityName: string, role: string) => {
  const loginLink = `${process.env.NEXTAUTH_URL}/login`;
  const html = `
    <h1>Account Created - Measles Outbreak Monitoring Platform</h1>
    <p>Hello,</p>
    <p>Your account has been created by the administrator. Here are your login details:</p>
    <ul>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Password:</strong> ${password}</li>
      <li><strong>Role:</strong> ${role}</li>
      <li><strong>Facility:</strong> ${facilityName}</li>
    </ul>
    <p>Please login to the platform using the link below and change your password:</p>
    <a href="${loginLink}">${loginLink}</a>
    <br/><br/>
    <p>If you did not expect this email, please contact your administrator.</p>
  `;
  await sendEmail(email, "Your account has been created - Measles Platform", html);
};

export const sendAccountStatusEmail = async (email: string, facilityName: string, isActive: boolean) => {
  const status = isActive ? "activated" : "deactivated";
  const html = `
    <h1>Account Status Update - Measles Outbreak Monitoring Platform</h1>
    <p>Hello,</p>
    <p>Your account has been <strong>${status}</strong> by the administrator.</p>
    <p>Facility: ${facilityName}</p>
    <p>${isActive ? "You can now login to the platform." : "You will no longer be able to login to the platform."}</p>
    <p>If you have questions, please contact your administrator.</p>
  `;
  await sendEmail(email, `Your account has been ${status} - Measles Platform`, html);
};
