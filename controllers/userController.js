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


// GET MATCHED TEACHERS FOR STUDENT
export const getMatchedTeachers = async (req, res) => {
  try {
    // 1. Ensure the user is a student
    if (req.user.registrationType !== "student") {
      return res.status(400).json({ message: "Only students can get matched teachers" });
    }

    const studentSubjects = req.user.studentDetails?.subjects || [];

    // 2. Find teachers where at least one subject matches
    const matchedTeachers = await User.find({
      registrationType: "teacher",
      isApproved: true,
      "teacherDetails.subjectsExpert": { $in: studentSubjects }
    }).select("fullName profilePic teacherDetails address");

    res.json(matchedTeachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const hireTeacher = async (req, res) => {
  const { teacherId } = req.body;
  const teacher = await User.findById(teacherId);
  
  if (!teacher.teacherDetails.hiredBy.includes(req.user._id)) {
    teacher.teacherDetails.hiredBy.push(req.user._id);
    await teacher.save();
  }
  res.json({ message: "Teacher hired successfully" });
};

export const rateTeacher = async (req, res) => {
  const { teacherId, rating, comment } = req.body;
  
  // 1. Create the review
  await Review.create({ student: req.user._id, teacher: teacherId, rating, comment });

  // 2. Update Teacher's average rating
  const reviews = await Review.find({ teacher: teacherId });
  const avg = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

  await User.findByIdAndUpdate(teacherId, {
    "teacherDetails.averageRating": avg.toFixed(1),
    "teacherDetails.totalReviews": reviews.length
  });

  res.json({ message: "Rating submitted" });
};