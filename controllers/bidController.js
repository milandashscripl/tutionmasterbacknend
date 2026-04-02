import Bid from "../models/Bid.js";
import User from "../models/User.js";

// GET ALL STUDENTS FOR TEACHERS (with premium restrictions)
export const getAllStudents = async (req, res) => {
  try {
    if (req.user.registrationType !== "teacher") {
      return res.status(403).json({ message: "Only teachers can view students" });
    }

    const teacher = req.user;
    const isPremium = teacher.membership === "teacher_premium" &&
                     teacher.membershipExpiry &&
                     new Date(teacher.membershipExpiry) > new Date();

    // Get all approved and verified students
    const allStudents = await User.find({
      registrationType: "student",
      isVerified: true,
      isApproved: true,
    }).select("fullName email phone studentDetails membership profilePic");

    // Filter out students who already have active teachers
    const availableStudents = allStudents.filter(student => {
      const hiredTeachers = student.studentDetails?.hiredTeachers || [];
      return !hiredTeachers.some(ht => ht.status === "active");
    });

    // Add bidding eligibility based on premium status
    const studentsWithEligibility = availableStudents.map(student => {
      // Check if student has premium membership (can pay higher fees)
      const studentIsPremium = student.membership === "student_premium" &&
                              student.membershipExpiry &&
                              new Date(student.membershipExpiry) > new Date();

      // Determine max bid amount teacher can offer
      const maxBidAmount = isPremium ? Infinity : 2000;

      // Check if teacher can bid on this student
      const canBid = studentIsPremium ? isPremium : true;

      return {
        ...student.toObject(),
        canBid,
        maxBidAmount,
        isPremiumStudent: studentIsPremium,
      };
    });

    res.json({
      students: studentsWithEligibility,
      teacherPremium: isPremium,
      totalStudents: studentsWithEligibility.length,
    });
  } catch (err) {
    console.error("Get all students error:", err);
    res.status(500).json({ message: err.message });
  }
};

// PLACE A BID ON A STUDENT
export const placeBid = async (req, res) => {
  try {
    if (req.user.registrationType !== "teacher") {
      return res.status(403).json({ message: "Only teachers can place bids" });
    }

    const { studentId, monthlyFee, message } = req.body;
    const teacherId = req.user._id;

    if (!studentId || !monthlyFee) {
      return res.status(400).json({ message: "Student ID and monthly fee are required" });
    }

    // Check if teacher is premium
    const teacher = req.user;
    const isPremium = teacher.membership === "teacher_premium" &&
                     teacher.membershipExpiry &&
                     new Date(teacher.membershipExpiry) > new Date();

    // Get student details
    const student = await User.findById(studentId);
    if (!student || student.registrationType !== "student") {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check if student already has an active teacher
    const hiredTeachers = student.studentDetails?.hiredTeachers || [];
    const hasActiveTeacher = hiredTeachers.some(ht => ht.status === "active");
    if (hasActiveTeacher) {
      return res.status(400).json({ message: "Student already has an active teacher" });
    }

    // Check bidding eligibility
    const studentIsPremium = student.membership === "student_premium" &&
                            student.membershipExpiry &&
                            new Date(student.membershipExpiry) > new Date();

    if (studentIsPremium && !isPremium) {
      return res.status(403).json({ message: "Only premium teachers can bid on premium students" });
    }

    // Check fee limits
    if (!isPremium && monthlyFee > 2000) {
      return res.status(400).json({ message: "Non-premium teachers can only bid up to ₹2000/month" });
    }

    // Check for existing pending bid
    const existingBid = await Bid.findOne({
      teacher: teacherId,
      student: studentId,
      status: "pending"
    });

    if (existingBid) {
      return res.status(400).json({ message: "You already have a pending bid for this student" });
    }

    // Create the bid
    const newBid = new Bid({
      teacher: teacherId,
      student: studentId,
      monthlyFee,
      message: message || "",
    });

    await newBid.save();
    await newBid.populate([
      { path: "teacher", select: "fullName profilePic teacherDetails" },
      { path: "student", select: "fullName profilePic studentDetails" }
    ]);

    res.status(201).json({
      message: "Bid placed successfully",
      bid: newBid
    });
  } catch (err) {
    console.error("Place bid error:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET BIDS FOR TEACHER
export const getTeacherBids = async (req, res) => {
  try {
    if (req.user.registrationType !== "teacher") {
      return res.status(403).json({ message: "Only teachers can view their bids" });
    }

    const bids = await Bid.find({ teacher: req.user._id })
      .populate("student", "fullName email phone studentDetails profilePic")
      .sort({ bidAt: -1 });

    res.json(bids);
  } catch (err) {
    console.error("Get teacher bids error:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET BIDS FOR STUDENT
export const getStudentBids = async (req, res) => {
  try {
    if (req.user.registrationType !== "student") {
      return res.status(403).json({ message: "Only students can view their bids" });
    }

    const bids = await Bid.find({ student: req.user._id })
      .populate("teacher", "fullName email phone teacherDetails profilePic")
      .sort({ bidAt: -1 });

    res.json(bids);
  } catch (err) {
    console.error("Get student bids error:", err);
    res.status(500).json({ message: err.message });
  }
};

// RESPOND TO BID (ACCEPT/REJECT)
export const respondToBid = async (req, res) => {
  try {
    if (req.user.registrationType !== "student") {
      return res.status(403).json({ message: "Only students can respond to bids" });
    }

    const { bidId, action } = req.body; // action: "accept" or "reject"

    if (!bidId || !["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "Valid bid ID and action (accept/reject) are required" });
    }

    const bid = await Bid.findById(bidId);
    if (!bid) {
      return res.status(404).json({ message: "Bid not found" });
    }

    if (bid.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only respond to bids sent to you" });
    }

    if (bid.status !== "pending") {
      return res.status(400).json({ message: "This bid has already been responded to" });
    }

    // Update bid status
    bid.status = action === "accept" ? "accepted" : "rejected";
    bid.respondedAt = new Date();
    await bid.save();

    if (action === "accept") {
      // Add teacher to student's hired teachers
      const student = await User.findById(req.user._id);
      const teacher = await User.findById(bid.teacher);

      // Check if student already has an active teacher
      const hasActiveTeacher = student.studentDetails?.hiredTeachers?.some(ht => ht.status === "active");
      if (hasActiveTeacher) {
        return res.status(400).json({ message: "You already have an active teacher" });
      }

      // Add to student's hired teachers
      student.studentDetails.hiredTeachers.push({
        teacher: bid.teacher,
        monthlyFee: bid.monthlyFee,
        hiredAt: new Date(),
        nextDueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: "active",
      });

      // Add to teacher's hired by
      teacher.teacherDetails.hiredBy.push(req.user._id);

      await student.save();
      await teacher.save();

      // Reject all other pending bids for this student
      await Bid.updateMany(
        { student: req.user._id, status: "pending", _id: { $ne: bidId } },
        { status: "rejected", respondedAt: new Date() }
      );
    }

    res.json({
      message: `Bid ${action}ed successfully`,
      bid
    });
  } catch (err) {
    console.error("Respond to bid error:", err);
    res.status(500).json({ message: err.message });
  }
};