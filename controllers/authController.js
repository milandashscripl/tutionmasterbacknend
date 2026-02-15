// controllers/authController.js
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import generateToken from "../utils/jwt.js";
import cloudinary from "../config/cloudinary.js";
// import User from "../models/User.js";
import { uploadToCloudinary } from "../utils/uploadCloudinary.js";

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Profile picture required" });
    }

    // ✅ Validate role
    const userRole = role === "teacher" ? "teacher" : "student";

    const hashedPassword = await bcrypt.hash(password, 10);
    const uploadedImage = await uploadToCloudinary(req.file.buffer);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: userRole,
      profilePic: {
        url: uploadedImage.secure_url,
        public_id: uploadedImage.public_id,
      },
    });

    user.password = undefined;

    res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error.message);
    res.status(500).json({ message: error.message });
  }
};





// ===============================
// LOGIN
// ===============================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

 res.json({
  message: "Login successful",
  user: {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  },
  token: generateToken(user),
});

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
