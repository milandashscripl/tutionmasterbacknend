import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional, system notifications don't have sender
  type: {
    type: String,
    enum: [
      "attendance_marked",
      "payment_due",
      "payment_received",
      "leave_approved",
      "leave_rejected",
      "session_reminder",
      "chapter_completed",
      "system_announcement",
      "teacher_request",
      "admin_message"
    ],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  readAt: Date,
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  },
  // Reference to related entities
  relatedAttendance: { type: mongoose.Schema.Types.ObjectId, ref: "Attendance" },
  relatedPayment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  relatedLeave: { type: mongoose.Schema.Types.ObjectId, ref: "LeaveRequest" },
  relatedChapter: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },
  // Additional metadata
  metadata: mongoose.Schema.Types.Mixed, // flexible object for extra data
  expiresAt: Date, // optional expiration for time-sensitive notifications
  createdAt: { type: Date, default: Date.now }
});

// Indexes
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);