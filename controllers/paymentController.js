import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Notification from "../models/Notification.js";
import { io } from "../server.js";

// Create payment record (for monthly fees, penalties, etc.)
export const createPayment = async (req, res) => {
  try {
    const { studentId, amount, type, description, billingPeriod, attendanceIds, penaltyReason } = req.body;
    const teacherId = req.user.id;

    // Verify teacher-student relationship
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: "Student not found" });
    }

    if (!student.assignedTeacher || student.assignedTeacher.toString() !== teacherId) {
      return res.status(403).json({ message: "Not authorized to create payments for this student" });
    }

    // Calculate leave deductions if it's a monthly fee
    let finalAmount = amount;
    let leaveDeductions = 0;

    if (type === 'monthly_fee' && billingPeriod) {
      const [month, year] = billingPeriod.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 31);

      // Count completed sessions in billing period
      const completedSessions = await Attendance.countDocuments({
        student: studentId,
        teacher: teacherId,
        date: { $gte: startDate, $lte: endDate },
        status: 'completed'
      });

      // Calculate expected sessions (assuming 30 days, 1 session per day = 30 sessions)
      const expectedSessions = 30;
      const absentSessions = expectedSessions - completedSessions;

      // Free leaves: 2 per month
      const freeLeaves = 2;
      const paidLeaves = Math.max(0, absentSessions - freeLeaves);

      // Calculate daily rate and deductions
      const dailyRate = amount / expectedSessions;
      leaveDeductions = paidLeaves * dailyRate;
      finalAmount = amount - leaveDeductions;
    }

    const payment = new Payment({
      student: studentId,
      teacher: teacherId,
      amount: finalAmount,
      originalAmount: amount,
      type,
      description,
      billingPeriod,
      attendanceIds,
      penaltyReason: type === 'penalty' ? penaltyReason : undefined,
      leaveDeductions,
      status: 'pending'
    });

    await payment.save();

    // Create notification for student
    await Notification.create({
      recipient: studentId,
      sender: teacherId,
      type: "payment_due",
      title: "Payment Due",
      message: `${type === 'monthly_fee' ? 'Monthly fee' : 'Payment'} of ₹${finalAmount} is due`,
      relatedPayment: payment._id,
      priority: "high"
    });

    // Emit real-time notification
    io.to(`user_${studentId}`).emit('notification', {
      type: 'payment_due',
      message: `Payment of ₹${finalAmount} is due`
    });

    res.status(201).json({
      message: "Payment created successfully",
      payment
    });
  } catch (error) {
    console.error("Create payment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Process payment (simulate Razorpay integration)
export const processPayment = async (req, res) => {
  try {
    const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const studentId = req.user.id;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.student.toString() !== studentId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ message: "Payment already processed" });
    }

    // In a real implementation, verify Razorpay signature here
    // For now, we'll simulate successful payment
    payment.status = 'completed';
    payment.razorpayOrderId = razorpayOrderId;
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.completedAt = new Date();

    await payment.save();

    // Create notification for teacher
    await Notification.create({
      recipient: payment.teacher,
      sender: studentId,
      type: "payment_received",
      title: "Payment Received",
      message: `Payment of ₹${payment.amount} received from student`,
      relatedPayment: payment._id
    });

    // Emit real-time notification
    io.to(`user_${payment.teacher}`).emit('notification', {
      type: 'payment_received',
      message: `Payment of ₹${payment.amount} received`
    });

    res.json({
      message: "Payment processed successfully",
      payment
    });
  } catch (error) {
    console.error("Process payment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get payments for student
export const getStudentPayments = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { page = 1, limit = 10, status, type, month, year } = req.query;

    let query = { student: studentId };

    if (status) query.status = status;
    if (type) query.type = type;

    if (month && year) {
      query.billingPeriod = `${month}-${year}`;
    }

    const payments = await Payment.find(query)
      .populate('teacher', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    // Calculate totals
    const totals = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      payments,
      totals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get student payments error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get payments for teacher
export const getTeacherPayments = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { page = 1, limit = 10, status, studentId, month, year } = req.query;

    let query = { teacher: teacherId };

    if (status) query.status = status;
    if (studentId) query.student = studentId;

    if (month && year) {
      query.billingPeriod = `${month}-${year}`;
    }

    const payments = await Payment.find(query)
      .populate('student', 'name email phone profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    // Calculate totals
    const totals = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      payments,
      totals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get teacher payments error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get payment statistics
export const getPaymentStats = async (req, res) => {
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
      matchQuery.billingPeriod = `${month}-${year}`;
    }

    const stats = await Payment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$status",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalReceived = stats.find(s => s._id === 'completed')?.totalAmount || 0;
    const totalPending = stats.find(s => s._id === 'pending')?.totalAmount || 0;
    const totalOverdue = stats.find(s => s._id === 'overdue')?.totalAmount || 0;

    res.json({
      stats,
      summary: {
        totalReceived,
        totalPending,
        totalOverdue,
        totalOutstanding: totalPending + totalOverdue
      }
    });
  } catch (error) {
    console.error("Get payment stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark payment as overdue (admin/teacher function)
export const markPaymentOverdue = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const teacherId = req.user.id;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    payment.status = 'overdue';
    payment.updatedAt = new Date();
    await payment.save();

    // Create notification for student
    await Notification.create({
      recipient: payment.student,
      sender: teacherId,
      type: "payment_due",
      title: "Payment Overdue",
      message: `Payment of ₹${payment.amount} is now overdue`,
      relatedPayment: payment._id,
      priority: "urgent"
    });

    res.json({
      message: "Payment marked as overdue",
      payment
    });
  } catch (error) {
    console.error("Mark payment overdue error:", error);
    res.status(500).json({ message: "Server error" });
  }
};