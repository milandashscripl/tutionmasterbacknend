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

    // Simplified details for the "Coming Soon" phase
    studentDetails: {
      standard: String,
      board: String,
      subjects: [String],
    },

    // Inside teacherDetails
teacherDetails: {
  teachingUpto: String,
  subjectsExpert: [String],
  distance: Number,
  // ADD THESE:
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  hiredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] 
},

    // User Preferences & App State
    settings: {
      theme: {
        type: String,
        enum: ["light", "blue", "green", "purple"],
        default: "light",
      },
      darkMode: { type: Boolean, default: false },
      notifications: { type: Boolean, default: true },
    },

    // Optional: Track interest for the "Coming Soon" launch
    hasOptedInForLaunchAlerts: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Indexing for faster searches on main identifiers
// Note: unique fields already have indexes, so no need to add explicit ones

export default mongoose.models.User || mongoose.model("User", userSchema);