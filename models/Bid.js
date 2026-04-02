import mongoose from "mongoose";

const bidSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    monthlyFee: {
      type: Number,
      required: true,
      min: 0,
    },
    message: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn"],
      default: "pending",
    },
    bidAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate active bids
bidSchema.index({ teacher: 1, student: 1, status: 1 }, { unique: true, partialFilterExpression: { status: "pending" } });

export default mongoose.model("Bid", bidSchema);