import bcrypt from "bcryptjs";
import User from "../models/User.js";
import generateToken from "../utils/jwt.js";
import { getDevOtp } from "../utils/otp.js";
import cloudinary from "../config/cloudinary.js";

// REGISTER
export const register = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      aadhar,
      addressText,
      lat,
      lng,
      registrationType,
    } = req.body;

    if (!fullName || !password || !aadhar || !registrationType || !phone) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const exists = await User.findOne({ $or: [{ email }, { phone }] });

    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    let profilePic = {};
    if (req.file) {
      try {
        // Do not attempt upload if Cloudinary credentials are missing
        if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_CLOUD_NAME) {
          console.warn("Cloudinary credentials missing - skipping image upload");
        } else if (req.file.buffer && req.file.buffer.length > 0) {
          const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
          const upload = await cloudinary.uploader.upload(dataUri, { folder: "users" });
          profilePic = { url: upload.secure_url, public_id: upload.public_id };
        } else if (req.file.path) {
          const upload = await cloudinary.uploader.upload(req.file.path, { folder: "users" });
          profilePic = { url: upload.secure_url, public_id: upload.public_id };
        } else {
          console.warn("Received file but no buffer/path available");
        }
      } catch (uploadErr) {
        console.error("Cloudinary upload failed:", uploadErr?.message || uploadErr);
        // don't throw — continue without profilePic, but surface a friendly message
        // (in production you may want to return an error instead)
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // OTP: use DEV_OTP if provided, otherwise generate a 6-digit code
    const otpToSend = process.env.DEV_OTP || (Math.floor(100000 + Math.random() * 900000).toString());

    const user = await User.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      aadhar,
      registrationType,
      address: {
        text: addressText,
        location: { lat, lng },
      },
      profilePic,
      isVerified: false,
      otp: otpToSend,
    });

    // In production you'd send this via SMS. For now log it so developers can read it.
    console.log(`OTP for ${phone} => ${otpToSend}`);

    res.status(201).json({ message: "OTP_SENT", phone });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const registerVerify = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ message: "Phone and OTP required" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ message: "User not found" });

    const expected = process.env.DEV_OTP || user.otp;
    if (otp !== expected) return res.status(400).json({ message: "Invalid OTP" });

    user.isVerified = true;
    user.otp = undefined;
    await user.save();

    res.json({ message: "Verified", token: generateToken(user._id), user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const login = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: "Account not verified" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      token: generateToken(user._id),
      user,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
