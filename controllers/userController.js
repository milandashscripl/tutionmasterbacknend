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

// HIRE AND PAY TEACHER (student pays first month fee)
export const hireTeacher = async (req, res) => {
  try {
    const { teacherId, amount } = req.body;
    if (!teacherId || !amount || amount <= 0) {
      return res.status(400).json({ message: "teacherId and positive amount are required" });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.registrationType !== "teacher") {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Ensure payment is not less than minimum teacher fee
    const minFee = teacher.teacherDetails?.fees?.minFee || 0;
    if (amount < minFee) {
      return res.status(400).json({ message: `Amount must be at least teacher min fee ${minFee}` });
    }

    // Create or update student hire record
    const student = await User.findById(req.user._id);
    const existingHire = student.studentDetails?.hiredTeachers?.find((item) => item.teacher.toString() === teacherId);

    const nextDueAt = new Date();
    nextDueAt.setMonth(nextDueAt.getMonth() + 1);

    if (existingHire) {
      existingHire.lastPaymentAt = new Date();
      existingHire.monthlyFee = amount;
      existingHire.nextDueAt = nextDueAt;
      existingHire.status = "active";
      existingHire.outstanding = 0;
    } else {
      student.studentDetails = student.studentDetails || {};
      student.studentDetails.hiredTeachers = student.studentDetails.hiredTeachers || [];
      student.studentDetails.hiredTeachers.push({
        teacher: teacherId,
        hiredAt: new Date(),
        monthlyFee: amount,
        lastPaymentAt: new Date(),
        nextDueAt,
        status: "active",
        outstanding: 0,
      });
    }

    // Mark teacher as hired and account payment info
    if (!teacher.teacherDetails.hiredBy.includes(req.user._id)) {
      teacher.teacherDetails.hiredBy.push(req.user._id);
    }
    teacher.teacherDetails.salaryDue = (teacher.teacherDetails.salaryDue || 0) + amount;
    teacher.teacherDetails.isActive = true;
    teacher.teacherDetails.paymentRecords = teacher.teacherDetails.paymentRecords || [];
    teacher.teacherDetails.paymentRecords.push({
      student: req.user._id,
      amount,
      paidAt: new Date(),
      status: "paid",
      dueForMonth: `${new Date().getFullYear()}-${new Date().getMonth() + 1}`,
    });

    await student.save();
    await teacher.save();

    res.json({ message: "Teacher hired and payment recorded", nextDueAt });
  } catch (err) {
    console.error("Hire teacher error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ADMIN: track payers & defaulters
export const getPaymentSummary = async (req, res) => {
  try {
    // Find all students with any hired teachers
    const students = await User.find({
      registrationType: "student",
      "studentDetails.hiredTeachers": { $exists: true, $ne: [] },
    }).select("fullName email studentDetails");

    // Identify defaulters
    const defaulters = [];
    const now = new Date();
    students.forEach((student) => {
      (student.studentDetails?.hiredTeachers || []).forEach((ht) => {
        if (ht.nextDueAt && new Date(ht.nextDueAt) < now && ht.status !== "active") {
          defaulters.push({
            studentId: student._id,
            studentName: student.fullName,
            teacherId: ht.teacher,
            monthlyFee: ht.monthlyFee,
            outstanding: ht.outstanding,
            nextDueAt: ht.nextDueAt,
            status: ht.status,
          });
        }
      });
    });

    const teachers = await User.find({ registrationType: "teacher" }).select("fullName email teacherDetails");

    res.json({ students, teachers, defaulters });
  } catch (err) {
    console.error("Payment summary error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ADMIN: activate/deactivate teacher based on payment status
export const setTeacherActiveStatus = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { isActive } = req.body;

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.registrationType !== "teacher") {
      return res.status(404).json({ message: "Teacher not found" });
    }

    teacher.teacherDetails.isActive = !!isActive;
    await teacher.save();

    res.json({ message: `Teacher ${isActive ? "activated" : "deactivated"}` });
  } catch (err) {
    console.error("Set teacher status error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ADMIN: check payer status and update teacher activity accordingly
export const checkPayers = async (req, res) => {
  try {
    const students = await User.find({
      registrationType: "student",
      "studentDetails.hiredTeachers": { $exists: true, $ne: [] },
    });

    const teacherStatus = new Map();
    const now = new Date();

    students.forEach((student) => {
      (student.studentDetails?.hiredTeachers || []).forEach((ht) => {
        const due = ht.nextDueAt ? new Date(ht.nextDueAt) : null;
        const isDefaulted = due && due < now && ht.status !== "active";

        // If any one student is defaulted for a teacher, teacher should be inactive
        if (isDefaulted) {
          teacherStatus.set(ht.teacher.toString(), false);
        } else {
          if (!teacherStatus.has(ht.teacher.toString())) {
            teacherStatus.set(ht.teacher.toString(), true);
          }
        }
      });
    });

    const updates = [];
    for (const [teacherId, isActive] of teacherStatus.entries()) {
      const teacher = await User.findById(teacherId);
      if (teacher) {
        teacher.teacherDetails.isActive = isActive;
        await teacher.save();
        updates.push({ teacherId, isActive });
      }
    }

    res.json({ message: "Teacher active statuses updated", updates });
  } catch (err) {
    console.error("Check payers error:", err);
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