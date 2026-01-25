// controllers/auth.controller.js
// ===============================
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import generateToken from "../utils/jwt.js";

/**
 * Generate 6 digit OTP
 */
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * SEND OTP TO PHONE
 * POST /api/auth/send-otp
 * body: { phone, name }
 */
export const sendOtp = async (req, res) => {
  try {
    const { phone, name } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Check user
    let user = await User.findOne({ phone });

    // Create user if not exists
    if (!user) {
      user = await User.create({
        phone,
        name: name || "User",
      });
    }

    const otp = generateOtp();

    // Save or update OTP
    await Otp.findOneAndUpdate(
      { phone },
      {
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
      { upsert: true }
    );

    // TODO: integrate SMS service here
    console.log("OTP for testing:", otp);

    res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * VERIFY OTP
 * POST /api/auth/verify-otp
 * body: { phone, otp }
 */
export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res
        .status(400)
        .json({ message: "Phone and OTP are required" });
    }

    const otpRecord = await Otp.findOne({ phone, otp });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const user = await User.findOne({ phone });

    user.isVerified = true;
    await user.save();

    // Delete OTP after success
    await Otp.deleteOne({ phone });

    res.status(200).json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
