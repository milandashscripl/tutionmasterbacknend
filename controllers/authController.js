// import bcrypt from "bcryptjs";
// import User from "../models/User.js";
// import generateToken from "../utils/jwt.js";

// // ===============================
// // REGISTER USER
// // ===============================
// export const registerUser = async (req, res) => {
//   try {
//     const { name, phone, password, confirmPassword } = req.body;

//     if (!name || !phone || !password || !confirmPassword) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     if (password !== confirmPassword) {
//       return res.status(400).json({ message: "Passwords do not match" });
//     }

//     if (password.length < 6) {
//       return res.status(400).json({
//         message: "Password must be at least 6 characters",
//       });
//     }

//     const userExists = await User.findOne({
//       $or: [{ phone }, { name }],
//     });

//     if (userExists) {
//       return res.status(400).json({
//         message: "User with this phone or name already exists",
//       });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await User.create({
//       name,
//       phone,
//       password: hashedPassword,
//     });

//     res.status(201).json({
//       success: true,
//       user: {
//         id: user._id,
//         name: user.name,
//         phone: user.phone,
//       },
//       token: generateToken(user._id),
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Registration failed" });
//   }
// };

// // ===============================
// // LOGIN USER
// // ===============================
// export const loginUser = async (req, res) => {
//   try {
//     const { phone, password } = req.body;

//     if (!phone || !password) {
//       return res.status(400).json({ message: "Phone and password required" });
//     }

//     const user = await User.findOne({ phone });

//     if (!user) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);

//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     res.status(200).json({
//       success: true,
//       user: {
//         id: user._id,
//         name: user.name,
//         phone: user.phone,
//       },
//       token: generateToken(user._id),
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Login failed" });
//   }
// };




import bcrypt from "bcryptjs";
import User from "../models/User.js";
import  sendOtpEmail  from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";

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


export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  if (!user.isVerified) {
    return res.status(401).json({ message: "Email not verified" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
};



export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });

  if (
    !user ||
    user.otp !== otp ||
    user.otpExpires < Date.now()
  ) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.json({ message: "Email verified successfully" });
};
