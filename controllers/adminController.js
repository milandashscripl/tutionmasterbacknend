import User from "../models/User.js";

// Get all pending users
export const getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({
      isVerified: false,
      registrationType: { $ne: "admin" },
    }).select("-password");

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Approve user
export const approveUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isVerified = true;
    await user.save();

    res.json({ message: "User approved successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin creates user directly
export const adminCreateUser = async (req, res) => {
  try {
    const { fullName, email, phone, password, aadhar, registrationType } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      aadhar,
      registrationType,
      isVerified: true, // Admin created → auto verified
    });

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};