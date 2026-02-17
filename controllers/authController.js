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
      otp,
    } = req.body;

    if (!fullName || !password || !aadhar) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // OTP check (DEV MODE)
    if (otp !== getDevOtp()) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const exists = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    let profilePic = {};
    if (req.file) {
      const upload = await cloudinary.uploader.upload(req.file.path, {
        folder: "users",
      });

      profilePic = {
        url: upload.secure_url,
        public_id: upload.public_id,
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      aadhar,
      address: {
        text: addressText,
        location: { lat, lng },
      },
      profilePic,
      isVerified: true,
    });

    res.status(201).json({
      message: "Registration successful",
      token: generateToken(user._id),
      user,
    });
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
