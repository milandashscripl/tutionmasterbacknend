import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  type: {
    type: String,
    enum: ["monthly_fee", "penalty", "refund", "extra_leave"],
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed", "cancelled"],
    default: "pending"
  },
  paymentMethod: {
    type: String,
    enum: ["razorpay", "wallet", "bank_transfer", "cash"],
    default: "razorpay"
  },
  transactionId: String, // Razorpay payment ID
  orderId: String, // Razorpay order ID
  description: String,
  billingPeriod: {
    startDate: Date,
    endDate: Date,
    month: String, // e.g., "2026-04"
  },
  leaveDays: {
    totalLeaveDays: { type: Number, default: 0 },
    freeLeaveDays: { type: Number, default: 2 },
    paidLeaveDays: { type: Number, default: 0 }
  },
  metadata: {
    attendanceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Attendance" }],
    leaveRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "LeaveRequest" }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: Date
});

// Indexes
paymentSchema.index({ student: 1, status: 1 });
paymentSchema.index({ teacher: 1, status: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ "billingPeriod.month": 1, student: 1 });

export default mongoose.models.Payment || mongoose.model("Payment", paymentSchema);