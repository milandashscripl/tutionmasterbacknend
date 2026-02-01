import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sendOtpEmail } from "../utils/sendEmail.js";

export const register = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    otp,
    otpExpires: Date.now() + 5 * 60 * 1000, // 5 min
  });

  await sendOtpEmail(email, otp);

  res.status(201).json({
    message: "OTP sent to email",
    userId: user._id,
  });
};
