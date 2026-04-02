import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { io } from "../server.js";

// Create attendance record (teacher marks attendance)
export const markAttendance = async (req, res) => {
  try {
    const { studentId, date, startTime, endTime, subject, chapter, medium, location, notes } = req.body;
    const teacherId = req.user.id;

    // Verify teacher-student relationship
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check if teacher is assigned to this student
    if (!student.assignedTeacher || student.assignedTeacher.toString() !== teacherId) {
      return res.status(403).json({ message: "Not authorized to mark attendance for this student" });
    }

    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findOne({
      student: studentId,
      teacher: teacherId,
      date: new Date(date)
    });

    if (existingAttendance) {
      return res.status(400).json({ message: "Attendance already marked for this date" });
    }

    const attendance = new Attendance({
      student: studentId,
      teacher: teacherId,
      date: new Date(date),
      startTime,
      endTime,
      subject,
      chapter,
      medium,
      location,
      notes,
      status: 'scheduled'
    });

    await attendance.save();

    // Create notification for student
    await Notification.create({
      recipient: studentId,
      sender: teacherId,
      type: "attendance_marked",
      title: "Session Scheduled",
      message: `Your ${subject} session is scheduled for ${new Date(date).toDateString()}`,
      relatedAttendance: attendance._id
    });

    // Emit real-time notification
    io.to(`user_${studentId}`).emit('notification', {
      type: 'attendance_marked',
      message: `Session scheduled for ${new Date(date).toDateString()}`
    });

    res.status(201).json({
      message: "Attendance marked successfully",
      attendance
    });
  } catch (error) {
    console.error("Mark attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update attendance status (teacher confirms arrival)
export const updateAttendanceStatus = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { status, actualStartTime, actualEndTime, rating, feedback, locationReached } = req.body;
    const teacherId = req.user.id;

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    if (attendance.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Update fields based on status
    if (status === 'reached') {
      attendance.status = 'reached';
      attendance.actualStartTime = actualStartTime;
      attendance.locationReached = locationReached;
    } else if (status === 'completed') {
      attendance.status = 'completed';
      attendance.actualEndTime = actualEndTime;
      attendance.rating = rating;
      attendance.feedback = feedback;
    }

    attendance.updatedAt = new Date();
    await attendance.save();

    // Create notification for student
    const notificationType = status === 'reached' ? 'Teacher has arrived' : 'Session completed';
    await Notification.create({
      recipient: attendance.student,
      sender: teacherId,
      type: "attendance_marked",
      title: notificationType,
      message: status === 'reached'
        ? "Your teacher has arrived for the session"
        : `Session completed. Rating: ${rating}/5`,
      relatedAttendance: attendance._id
    });

    // Emit real-time update
    io.to(`user_${attendance.student}`).emit('attendance_update', {
      attendanceId,
      status,
      message: notificationType
    });

    res.json({
      message: "Attendance updated successfully",
      attendance
    });
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get attendance records for a student (student view)
export const getStudentAttendance = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { page = 1, limit = 10, status, month, year } = req.query;

    let query = { student: studentId };

    if (status) query.status = status;

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 31);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(query)
      .populate('teacher', 'name email phone')
      .populate('chapter', 'chapterName subject')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);

    res.json({
      attendance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get student attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get attendance records for a teacher (teacher view)
export const getTeacherAttendance = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { page = 1, limit = 10, status, studentId, month, year } = req.query;

    let query = { teacher: teacherId };

    if (status) query.status = status;
    if (studentId) query.student = studentId;

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 31);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(query)
      .populate('student', 'name email phone profilePicture')
      .populate('chapter', 'chapterName subject')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);

    res.json({
      attendance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get teacher attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get today's attendance for teacher
export const getTodayAttendance = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.find({
      teacher: teacherId,
      date: { $gte: today, $lt: tomorrow }
    })
    .populate('student', 'name phone profilePicture')
    .populate('chapter', 'chapterName subject')
    .sort({ startTime: 1 });

    res.json({ attendance });
  } catch (error) {
    console.error("Get today attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get attendance statistics
export const getAttendanceStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { month, year } = req.query;

    let matchQuery = {};
    if (userRole === 'student') {
      matchQuery.student = userId;
    } else if (userRole === 'teacher') {
      matchQuery.teacher = userId;
    }

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 31);
      matchQuery.date = { $gte: startDate, $lte: endDate };
    }

    const stats = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgRating: { $avg: "$rating" }
        }
      }
    ]);

    const totalSessions = stats.reduce((sum, stat) => sum + stat.count, 0);
    const completedSessions = stats.find(s => s._id === 'completed')?.count || 0;
    const attendanceRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    res.json({
      stats,
      summary: {
        totalSessions,
        completedSessions,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        averageRating: stats.find(s => s._id === 'completed')?.avgRating || 0
      }
    });
  } catch (error) {
    console.error("Get attendance stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};