import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";

// ===============================
// PROFILE
// ===============================

// GET PROFILE
export const getProfile = async (req, res) => {
  res.json(req.user);
};

// UPDATE PROFILE
export const updateProfile = async (req, res) => {
  try {
    const updates = { ...req.body };

    // Upload profile pic
    if (req.file && req.file.buffer && process.env.CLOUDINARY_API_KEY) {
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

      const upload = await cloudinary.uploader.upload(dataUri, {
        folder: "users",
      });

      updates.profilePic = {
        url: upload.secure_url,
        public_id: upload.public_id,
      };
    }

    const allowed = [
      "fullName",
      "email",
      "phone",
      "aadhar",
      "registrationType",
      "profilePic",
    ];

    const payload = {};

    Object.keys(updates).forEach((key) => {
      if (allowed.includes(key)) {
        payload[key] = updates[key];
      }
    });

    // Address handling
    if (updates.addressText || updates.lat || updates.lng) {
      payload.address = {
        text: updates.addressText || req.user.address?.text,
        location: {
          lat: updates.lat
            ? Number(updates.lat)
            : req.user.address?.location?.lat,
          lng: updates.lng
            ? Number(updates.lng)
            : req.user.address?.location?.lng,
        },
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      payload,
      { new: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// DELETE USER
export const deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.user._id);
  res.json({ message: "Account deleted" });
};

// UPDATE SETTINGS
// UPDATE SETTINGS
export const updateUserSettings = async (req, res) => {
  try {
    const { theme, darkMode, notifications } = req.body;

    // We build an object only with the provided values
    const settingsUpdate = {};
    if (theme !== undefined) settingsUpdate["settings.theme"] = theme;
    if (darkMode !== undefined) settingsUpdate["settings.darkMode"] = darkMode;
    if (notifications !== undefined) settingsUpdate["settings.notifications"] = notifications;

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: settingsUpdate }, // Use $set to update specific sub-fields
      { new: true, runValidators: true }
    ).select("-password");

    res.json(updated);
  } catch (err) {
    console.error("Settings Update Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET ALL USERS (for chat)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
    }).select("-password");

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
