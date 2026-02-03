import { Resend } from "resend";

export const sendOtpEmail = async (email, otp) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Your OTP Verification Code",
    html: `<h1>Your OTP is ${otp}</h1>`,
  });
};
