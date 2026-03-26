import User from "../models/User.js";
import Review from "../models/Review.js"; // Ensure this model exists in /models/Review.js
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

    // Upload profile pic to Cloudinary
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
          lat: updates.lat ? Number(updates.lat) : req.user.address?.location?.lat,
          lng: updates.lng ? Number(updates.lng) : req.user.address?.location?.lng,
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
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE SETTINGS
export const updateUserSettings = async (req, res) => {
  try {
    const { theme, darkMode, notifications } = req.body;

    const settingsUpdate = {};
    if (theme !== undefined) settingsUpdate["settings.theme"] = theme;
    if (darkMode !== undefined) settingsUpdate["settings.darkMode"] = darkMode;
    if (notifications !== undefined) settingsUpdate["settings.notifications"] = notifications;

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: settingsUpdate },
      { new: true, runValidators: true }
    ).select("-password");

    res.json(updated);
  } catch (err) {
    console.error("Settings Update Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ===============================
// CHAT & DISCOVERY
// ===============================

// GET ALL USERS (for chat search)
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
    if (req.user.registrationType !== "student") {
      return res.status(400).json({ message: "Only students can get matched teachers" });
    }

    const studentSubjects = req.user.studentDetails?.subjects || [];

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

// ===============================
// HIRING & RATINGS
// ===============================

// HIRE A TEACHER
export const hireTeacher = async (req, res) => {
  try {
    const { teacherId } = req.body;
    const teacher = await User.findById(teacherId);

    if (!teacher || teacher.registrationType !== "teacher") {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Check if already hired to prevent duplicates
    if (!teacher.teacherDetails.hiredBy.includes(req.user._id)) {
      teacher.teacherDetails.hiredBy.push(req.user._id);
      await teacher.save();
    }

    res.json({ message: "Teacher hired successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// RATE A TEACHER
export const rateTeacher = async (req, res) => {
  try {
    const { teacherId, rating, comment } = req.body;

    if (!teacherId || !rating) {
      return res.status(400).json({ message: "Teacher ID and rating are required" });
    }

    // 1. Create the review document
    await Review.create({ 
      student: req.user._id, 
      teacher: teacherId, 
      rating: Number(rating), 
      comment 
    });

    // 2. Fetch all reviews for this teacher to calculate new average
    const reviews = await Review.find({ teacher: teacherId });
    const totalRatingCount = reviews.length;
    const averageRating = reviews.reduce((acc, item) => item.rating + acc, 0) / totalRatingCount;

    // 3. Update the Teacher User document
    await User.findByIdAndUpdate(teacherId, {
      "teacherDetails.averageRating": Number(averageRating.toFixed(1)),
      "teacherDetails.totalReviews": totalRatingCount
    });

    res.json({ message: "Rating submitted successfully" });
  } catch (err) {
    console.error("Rate Teacher Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET REVIEWS FOR A SPECIFIC TEACHER
export const getTeacherReviews = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const reviews = await Review.find({ teacher: teacherId })
      .populate("student", "fullName profilePic") // Get student details
      .sort({ createdAt: -1 }); // Newest first

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET TOP RATED TEACHERS (For Landing Page)
export const getTopTutors = async (req, res) => {
  try {
    const topTutors = await User.find({
      registrationType: "teacher",
      isApproved: true,
      "teacherDetails.averageRating": { $gte: 4 } // Only 4 stars and above
    })
    .sort({ "teacherDetails.averageRating": -1 })
    .limit(6) // Top 6 for the grid
    .select("fullName profilePic teacherDetails address");

    res.json(topTutors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};