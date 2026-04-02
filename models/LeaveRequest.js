import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userType: {
    type: String,
    enum: ["student", "teacher"],
    required: true
  },
  type: {
    type: String,
    enum: ["student_leave", "teacher_leave"],
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalDays: { type: Number, required: true },
  reason: {
    type: String,
    enum: ["sick", "emergency", "vacation", "exam", "other"],
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "cancelled"],
    default: "pending"
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin who approved
  approvedAt: Date,
  rejectedReason: String,

  // For students: calculate payable leave days
  leaveCalculation: {
    freeLeaveDays: { type: Number, default: 2 }, // 2 free days per month
    paidLeaveDays: { type: Number, default: 0 },
    totalPayableDays: { type: Number, default: 0 },
    dailyRate: { type: Number, default: 0 } // calculated from monthly fee
  },

  // Affected sessions (for teachers) or classes (for students)
  affectedSessions: [{
    date: Date,
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // for teacher leaves
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // for student leaves
    status: {
      type: String,
      enum: ["cancelled", "rescheduled", "makeup_needed"],
      default: "cancelled"
    }
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
leaveRequestSchema.index({ user: 1, status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });
leaveRequestSchema.index({ "affectedSessions.date": 1 });

export default mongoose.models.LeaveRequest || mongoose.model("LeaveRequest", leaveRequestSchema);