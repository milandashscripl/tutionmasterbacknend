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
      registrationType,
      gender,
      age,
      addressText,
      lat,
      lng,
      /* student */
      standard,
      board,
      subjects,
      /* teacher */
      teachingUpto,
      distance,
      minFee,
      maxFee,
      pricing
    } = req.body;

    if (!fullName || !phone || !password || !registrationType) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Check if user already exists
    const exists = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    /* OTP GENERATION */
    const otpToSend = getDevOtp() || (Math.floor(100000 + Math.random() * 900000)).toString();

    /* PROFILE PIC */
    let profilePic = {};
    if (req.file) {
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const upload = await cloudinary.uploader.upload(dataUri, {
        folder: "users"
      });
      profilePic = {
        url: upload.secure_url,
        public_id: upload.public_id
      };
    }

    /* SUBJECT ARRAY */
    let subjectsArray = [];
    if (subjects) {
      subjectsArray = subjects.split(",").map(s => s.trim());
    }

    /* USER DATA CONSTRUCTION */
    const userData = {
      fullName,
      email,
      phone,
      password: hashedPassword,
      aadhar,
      registrationType,
      gender,
      age,
      address: {
        text: addressText,
        location: { lat, lng }
      },
      profilePic,
      otp: otpToSend,
      isVerified: false,
      isApproved: false
    };

    if (registrationType === "student") {
      userData.studentDetails = {
        standard,
        board,
        subjects: subjectsArray
      };
    }

    if (registrationType === "teacher") {
      // Parse per-standard pricing string if provided: "10:2500,11:3000"
      let pricingArr = [];
      if (pricing) {
        pricingArr = pricing
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
          .map((entry) => {
            const [std, val] = entry.split(":").map((x) => x.trim());
            return { standard: std, price: Number(val || 0) };
          })
          .filter((item) => item.standard && item.price > 0);
      }
      userData.teacherDetails = {
        teachingUpto,
        subjectsExpert: subjectsArray,
        distance,
        fees: {
          minFee: Number(minFee) || 0,
          maxFee: Number(maxFee) || 0,
        },
        pricing: pricingArr,
      };
    }

    const user = await User.create(userData);

    console.log(`OTP for ${phone} => ${otpToSend}`);

    res.status(201).json({
      message: "OTP_SENT",
      phone
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// REGISTER VERIFY
export const registerVerify = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ message: "Phone and OTP required" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ message: "User not found" });

    const expected = getDevOtp() || user.otp;
    if (otp !== expected) return res.status(400).json({ message: "Invalid OTP" });

    user.isVerified = true;
    user.otp = undefined; 
    await user.save();

    res.json({
      message: "OTP Verified. Waiting for admin approval"
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// LOGIN
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
      return res.status(401).json({ message: "OTP verification required" });
    }

    if (user.registrationType !== "admin" && !user.isApproved) {
      return res.status(401).json({ message: "Waiting for admin approval" });
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

// FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone is required" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ message: "User not found" });

    const otpToSend = getDevOtp() || (Math.floor(100000 + Math.random() * 900000).toString());
    user.otp = otpToSend;
    await user.save();

    console.log(`Password reset OTP for ${phone} => ${otpToSend}`);

    return res.json({ message: "OTP_SENT", phone });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;
    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ message: "Phone, OTP and newPassword required" });
    }

    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ message: "User not found" });

    const expected = getDevOtp() || user.otp;
    if (otp !== expected) return res.status(400).json({ message: "Invalid OTP" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    await user.save();

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};