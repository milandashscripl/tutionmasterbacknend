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
// UPDATE PROFILE
export const updateProfile = async (req, res) => {
  try {
    const updates = { ...req.body };
    const payload = {};

    // 1. Handle File Upload (Cloudinary)
    if (req.file && req.file.buffer && process.env.CLOUDINARY_API_KEY) {
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const upload = await cloudinary.uploader.upload(dataUri, {
        folder: "users",
      });
      payload.profilePic = {
        url: upload.secure_url,
        public_id: upload.public_id,
      };
    }

    // 2. Allowed Top-Level Fields
    const allowed = [
      "fullName",
      "email",
      "phone",
      "aadhar",
      "gender",
      "age",
      "addressText"
    ];

    allowed.forEach((key) => {
      if (updates[key] !== undefined) {
        payload[key] = updates[key];
      }
    });

    // 3. Handle Nested Teacher Details (Parsed from JSON String)
    if (updates.teacherDetails) {
      try {
        const tDetails = JSON.parse(updates.teacherDetails);
        payload.teacherDetails = {
          ...req.user.teacherDetails?.toObject(), // Keep existing fields like averageRating/hiredBy
          teachingUpto: tDetails.teachingUpto,
          distance: Number(tDetails.distance),
          subjectsExpert: tDetails.subjectsExpert,
          pricing: tDetails.pricing, // This matches the string format from Register
          fees: {
            minFee: Number(tDetails.minFee),
            maxFee: Number(tDetails.maxFee)
          }
        };
      } catch (e) {
        console.error("Teacher details parse error", e);
      }
    }

    // 4. Handle Nested Student Details (Parsed from JSON String)
    if (updates.studentDetails) {
      try {
        const sDetails = JSON.parse(updates.studentDetails);
        payload.studentDetails = {
          ...req.user.studentDetails?.toObject(),
          standard: sDetails.standard,
          board: sDetails.board,
          subjects: sDetails.subjects
        };
      } catch (e) {
        console.error("Student details parse error", e);
      }
    }

    // 5. Unified Address Handling
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
      { $set: payload }, // Use $set to prevent overwriting other fields
      { new: true, runValidators: true }
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
    const { teacherId, amount: amountInput } = req.body;
    if (!teacherId) {
      return res.status(400).json({ message: "teacherId is required" });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.registrationType !== "teacher") {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const student = await User.findById(req.user._id);
    const studentStandard = student.studentDetails?.standard;
    if (!studentStandard) {
      return res.status(400).json({ message: "Student standard not set in profile" });
    }

    // Determine base price for this student's standard using teacher-defined pricing
    const priceEntry = (teacher.teacherDetails?.pricing || []).find((p) => p.standard === studentStandard);
    let baseMonthlyFee = priceEntry?.price || teacher.teacherDetails?.fees?.minFee || 0;
    if (!baseMonthlyFee || baseMonthlyFee <= 0) {
      return res.status(400).json({ message: "Teacher has not set a valid price for your standard" });
    }

    // Apply rating-based price hike
    const rating = Number(teacher.teacherDetails?.averageRating) || 0;
    const hikeMultiplier = 1 + Math.max(0, rating - 4) * 0.1;
    const amount = Math.ceil(baseMonthlyFee * hikeMultiplier);

    if (amountInput && Number(amountInput) !== amount) {
      return res.status(400).json({ message: `Invalid amount. Required prepayment based on teacher setting: ${amount}` });
    }

    // Create or update student hire record
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
    teacher.teacherDetails.hiredBy = teacher.teacherDetails.hiredBy || [];
    if (!teacher.teacherDetails.hiredBy.find((id) => id.toString() === req.user._id.toString())) {
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

    res.json({ message: "Teacher hired and payment recorded", amount, nextDueAt });
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
        if (ht.nextDueAt && new Date(ht.nextDueAt) < now) {
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
        const isDefaulted = due && due < now;

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
      comment,
    });

    // 2. Fetch all reviews for this teacher to calculate new average
    const reviews = await Review.find({ teacher: teacherId });
    const totalRatingCount = reviews.length;
    const averageRating = reviews.reduce((acc, item) => item.rating + acc, 0) / totalRatingCount;

    // 3. Update the Teacher User document
    const teacher = await User.findById(teacherId);
    const oldRating = teacher.teacherDetails?.averageRating || 0;
    const newRatingValue = Number(averageRating.toFixed(1));

    // Apply auto price hike for higher ratings (4.0+ gets incrementally higher rate)
    if (oldRating < 4.0 && newRatingValue >= 4.0) {
      // Increase existing pricing by 10% when crossing from <4.0 to >=4.0
      teacher.teacherDetails.pricing = (teacher.teacherDetails.pricing || []).map((entry) => ({
        standard: entry.standard,
        price: Math.ceil(entry.price * 1.1),
      }));
      teacher.teacherDetails.fees.minFee = Math.ceil((teacher.teacherDetails.fees?.minFee || 0) * 1.1);
      teacher.teacherDetails.fees.maxFee = Math.ceil((teacher.teacherDetails.fees?.maxFee || 0) * 1.1);
    } else if (oldRating >= 4.0 && newRatingValue >= 4.5 && oldRating < 4.5) {
      // Additional bump by 5% when upscale from 4.0-4.4 to 4.5+
      teacher.teacherDetails.pricing = (teacher.teacherDetails.pricing || []).map((entry) => ({
        standard: entry.standard,
        price: Math.ceil(entry.price * 1.05),
      }));
      teacher.teacherDetails.fees.minFee = Math.ceil((teacher.teacherDetails.fees?.minFee || 0) * 1.05);
      teacher.teacherDetails.fees.maxFee = Math.ceil((teacher.teacherDetails.fees?.maxFee || 0) * 1.05);
    }

    teacher.teacherDetails.averageRating = newRatingValue;
    teacher.teacherDetails.totalReviews = totalRatingCount;
    await teacher.save();

    res.json({ message: "Rating submitted successfully", averageRating: newRatingValue });
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