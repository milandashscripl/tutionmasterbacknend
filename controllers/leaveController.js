import LeaveRequest from "../models/LeaveRequest.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Notification from "../models/Notification.js";
import { io } from "../server.js";

// Create leave request
export const createLeaveRequest = async (req, res) => {
  try {
    const { startDate, endDate, reason, description } = req.body;
    const teacherId = req.user.id;

    // Calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysRequested = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Get assigned students
    const assignedStudents = await User.find({ assignedTeacher: teacherId, role: 'student' });

    // Calculate affected sessions
    const affectedSessions = [];
    for (const student of assignedStudents) {
      const sessions = await Attendance.find({
        student: student._id,
        teacher: teacherId,
        date: { $gte: start, $lte: end },
        status: { $in: ['scheduled', 'reached'] }
      }).select('_id date startTime subject');

      affectedSessions.push(...sessions.map(session => ({
        sessionId: session._id,
        studentId: student._id,
        studentName: student.name,
        date: session.date,
        startTime: session.startTime,
        subject: session.subject
      })));
    }

    // Check available leave balance (2 free leaves per month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const usedLeaves = await LeaveRequest.countDocuments({
      teacher: teacherId,
      status: 'approved',
      $expr: {
        $and: [
          { $eq: [{ $month: '$startDate' }, currentMonth + 1] },
          { $eq: [{ $year: '$startDate' }, currentYear] }
        ]
      }
    });

    const freeLeavesRemaining = Math.max(0, 2 - usedLeaves);
    const paidLeaves = Math.max(0, daysRequested - freeLeavesRemaining);

    const leaveRequest = new LeaveRequest({
      teacher: teacherId,
      startDate,
      endDate,
      daysRequested,
      reason,
      description,
      affectedSessions,
      freeLeavesUsed: Math.min(daysRequested, freeLeavesRemaining),
      paidLeaves: paidLeaves,
      status: 'pending'
    });

    await leaveRequest.save();

    // Create notifications for affected students
    for (const session of affectedSessions) {
      await Notification.create({
        recipient: session.studentId,
        sender: teacherId,
        type: "leave_request",
        title: "Teacher Leave Notice",
        message: `Your teacher has requested leave from ${startDate} to ${endDate}`,
        relatedLeave: leaveRequest._id
      });
    }

    res.status(201).json({
      message: "Leave request created successfully",
      leaveRequest
    });
  } catch (error) {
    console.error("Create leave request error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Approve/Reject leave request (admin only)
export const processLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { action, adminNotes } = req.body; // action: 'approve' or 'reject'

    const leaveRequest = await LeaveRequest.findById(leaveId).populate('teacher', 'name email');
    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (action === 'approve') {
      leaveRequest.status = 'approved';
      leaveRequest.approvedBy = req.user.id;
      leaveRequest.approvedAt = new Date();
      leaveRequest.adminNotes = adminNotes;

      // Cancel affected sessions
      for (const session of leaveRequest.affectedSessions) {
        await Attendance.findByIdAndUpdate(session.sessionId, {
          status: 'cancelled',
          cancellationReason: 'Teacher Leave'
        });
      }
    } else if (action === 'reject') {
      leaveRequest.status = 'rejected';
      leaveRequest.rejectedBy = req.user.id;
      leaveRequest.rejectedAt = new Date();
      leaveRequest.adminNotes = adminNotes;
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await leaveRequest.save();

    // Create notification for teacher
    await Notification.create({
      recipient: leaveRequest.teacher._id,
      sender: req.user.id,
      type: action === 'approve' ? "leave_approved" : "leave_rejected",
      title: `Leave Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      message: `Your leave request from ${leaveRequest.startDate.toDateString()} to ${leaveRequest.endDate.toDateString()} has been ${action === 'approve' ? 'approved' : 'rejected'}`,
      relatedLeave: leaveRequest._id
    });

    // Emit real-time notification
    io.to(`user_${leaveRequest.teacher._id}`).emit('notification', {
      type: `leave_${action === 'approve' ? 'approved' : 'rejected'}`,
      message: `Leave request ${action === 'approve' ? 'approved' : 'rejected'}`
    });

    res.json({
      message: `Leave request ${action}d successfully`,
      leaveRequest
    });
  } catch (error) {
    console.error("Process leave request error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get leave requests for teacher
export const getTeacherLeaveRequests = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    let query = { teacher: teacherId };
    if (status) query.status = status;

    const leaveRequests = await LeaveRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await LeaveRequest.countDocuments(query);

    res.json({
      leaveRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get teacher leave requests error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all leave requests (admin only)
export const getAllLeaveRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, teacherId } = req.query;

    let query = {};
    if (status) query.status = status;
    if (teacherId) query.teacher = teacherId;

    const leaveRequests = await LeaveRequest.find(query)
      .populate('teacher', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await LeaveRequest.countDocuments(query);

    res.json({
      leaveRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get all leave requests error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get leave balance for teacher
export const getLeaveBalance = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Count approved leaves this month
    const usedLeaves = await LeaveRequest.countDocuments({
      teacher: teacherId,
      status: 'approved',
      $expr: {
        $and: [
          { $eq: [{ $month: '$startDate' }, currentMonth + 1] },
          { $eq: [{ $year: '$startDate' }, currentYear] }
        ]
      }
    });

    const freeLeavesRemaining = Math.max(0, 2 - usedLeaves);

    // Get pending leave requests
    const pendingRequests = await LeaveRequest.find({
      teacher: teacherId,
      status: 'pending'
    }).select('daysRequested startDate endDate');

    res.json({
      balance: {
        totalFreeLeaves: 2,
        usedFreeLeaves: usedLeaves,
        remainingFreeLeaves: freeLeavesRemaining
      },
      pendingRequests
    });
  } catch (error) {
    console.error("Get leave balance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Cancel leave request (teacher only)
export const cancelLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const teacherId = req.user.id;

    const leaveRequest = await LeaveRequest.findById(leaveId);
    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (leaveRequest.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ message: "Cannot cancel processed leave request" });
    }

    leaveRequest.status = 'cancelled';
    leaveRequest.updatedAt = new Date();
    await leaveRequest.save();

    res.json({
      message: "Leave request cancelled successfully",
      leaveRequest
    });
  } catch (error) {
    console.error("Cancel leave request error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// === STUDENT LEAVE FUNCTIONS ===

// Create student leave request
export const createStudentLeaveRequest = async (req, res) => {
  try {
    const { startDate, endDate, reason, description } = req.body;
    const studentId = req.user._id;

    // Calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (totalDays <= 0) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    // Get student details
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Find affected sessions
    const affectedSessions = await Attendance.find({
      student: studentId,
      date: { $gte: start, $lte: end },
      status: { $in: ['scheduled', 'completed'] }
    }).populate('teacher', 'fullName email');

    // Check free leave balance (2 per month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const usedLeaves = await LeaveRequest.aggregate([
      {
        $match: {
          user: studentId,
          userType: 'student',
          status: 'approved',
          $expr: {
            $and: [
              { $eq: [{ $month: '$startDate' }, currentMonth + 1] },
              { $eq: [{ $year: '$startDate' }, currentYear] }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    const usedDays = usedLeaves.length > 0 ? usedLeaves[0].totalDays : 0;
    const freeLeavesRemaining = Math.max(0, 2 - usedDays);
    const paidLeaveDays = Math.max(0, totalDays - freeLeavesRemaining);

    const leaveRequest = new LeaveRequest({
      user: studentId,
      userType: 'student',
      type: 'student_leave',
      startDate,
      endDate,
      totalDays,
      reason,
      description,
      status: 'pending',
      affectedSessions: affectedSessions.map(s => ({
        date: s.date,
        teacher: s.teacher._id,
        status: 'cancelled'
      })),
      leaveCalculation: {
        freeLeaveDays: Math.min(totalDays, freeLeavesRemaining),
        paidLeaveDays,
        totalPayableDays: paidLeaveDays,
        dailyRate: 0 // Will be calculated based on teacher fee
      }
    });

    await leaveRequest.save();

    // Notify assigned teacher
    if (student.hiredTeachers && student.hiredTeachers.length > 0) {
      for (const hiring of student.hiredTeachers) {
        await Notification.create({
          recipient: hiring.teacher,
          sender: studentId,
          type: "student_leave",
          title: "Student Leave Notice",
          message: `Student ${student.fullName} has requested leave from ${new Date(startDate).toDateString()} to ${new Date(endDate).toDateString()}`,
          relatedLeave: leaveRequest._id
        });
      }
    }

    res.status(201).json({
      message: "Leave request submitted successfully",
      leaveRequest: {
        ...leaveRequest.toObject(),
        affectedSessionsCount: affectedSessions.length
      }
    });
  } catch (error) {
    console.error("Create student leave request error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get student leave requests
export const getStudentLeaveRequests = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    let query = { user: studentId, userType: 'student' };
    if (status) query.status = status;

    const leaveRequests = await LeaveRequest.find(query)
      .populate('affectedSessions.teacher', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await LeaveRequest.countDocuments(query);

    res.json({
      leaveRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get student leave requests error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get student leave balance
export const getStudentLeaveBalance = async (req, res) => {
  try {
    const studentId = req.user._id;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Calculate used leaves this month
    const usedLeavesData = await LeaveRequest.aggregate([
      {
        $match: {
          user: mongooseTypes.ObjectId(studentId),
          userType: 'student',
          status: 'approved',
          $expr: {
            $and: [
              { $eq: [{ $month: '$startDate' }, currentMonth + 1] },
              { $eq: [{ $year: '$startDate' }, currentYear] }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    const usedDays = usedLeavesData.length > 0 ? usedLeavesData[0].totalDays : 0;
    const remainingDays = Math.max(0, 2 - usedDays);

    // Get pending requests
    const pendingRequests = await LeaveRequest.find({
      user: studentId,
      userType: 'student',
      status: 'pending'
    }).select('startDate endDate totalDays reason');

    res.json({
      balance: {
        totalFreeLeaves: 2,
        usedFreeLeaves: usedDays,
        remainingFreeLeaves: remainingDays
      },
      pendingRequests,
      month: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
    });
  } catch (error) {
    console.error("Get student leave balance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Cancel student leave request
export const cancelStudentLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const studentId = req.user._id;

    const leaveRequest = await LeaveRequest.findById(leaveId);
    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (leaveRequest.user.toString() !== studentId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ message: "Cannot cancel processed leave request" });
    }

    leaveRequest.status = 'cancelled';
    leaveRequest.updatedAt = new Date();
    await leaveRequest.save();

    res.json({
      message: "Leave request cancelled successfully",
      leaveRequest
    });
  } catch (error) {
    console.error("Cancel student leave request error:", error);
    res.status(500).json({ message: "Server error" });
  }
};