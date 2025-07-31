import transporter from "../config/mail.js";

export const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${process.env.BACKEND_URL}api/auth/verify?token=${token}`;
  try {
    await transporter.sendMail({
      from: `"CampusCord" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Verify your email",
      html: `<p>Hey ${user.username} 👋 Welcome to CampusCord. <br/> Click <a href="${verifyUrl}"> click </a> to verify your email.</p>`,
    });
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");    
  }
};