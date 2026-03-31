import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    aadhar: { type: String, required: true },

    registrationType: {
      type: String,
      enum: ["student", "teacher", "admin"],
      required: true,
    },

    // Verification & Admin Approval
    otp: { type: String },
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },

    // Basic Info
    gender: String,
    age: Number,

    address: {
      text: String,
      location: {
        lat: Number,
        lng: Number,
      },
    },

    profilePic: {
      url: String,
      public_id: String,
    },

    studentDetails: {
      standard: String,
      board: String,
      subjects: [String],
      hiredTeachers: [
        {
          teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          hiredAt: { type: Date, default: Date.now },
          monthlyFee: Number,
          lastPaymentAt: Date,
          nextDueAt: Date,
          status: {
            type: String,
            enum: ["active", "pending", "defaulted"],
            default: "active",
          },
          outstanding: { type: Number, default: 0 },
        },
      ],
    },

    teacherDetails: {
      teachingUpto: String,
      subjectsExpert: [String],
      distance: Number,
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      hiredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      fees: {
        minFee: { type: Number, default: 0 },
        maxFee: { type: Number, default: 0 },
      },
      pricing: [
        {
          standard: String,
          price: { type: Number, default: 0 },
        },
      ],
      isActive: { type: Boolean, default: true },
      salaryDue: { type: Number, default: 0 },
      paymentRecords: [
        {
          student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          amount: Number,
          paidAt: Date,
          status: {
            type: String,
            enum: ["paid", "pending", "defaulted"],
            default: "paid",
          },
          dueForMonth: String,
        },
      ],
    }, // <--- THIS WAS MISSING

    // Optional: Track interest for the "Coming Soon" phase
    hasOptedInForLaunchAlerts: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);