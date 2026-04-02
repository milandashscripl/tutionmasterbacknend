import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ["scheduled", "teacher_reached", "started", "completed", "cancelled", "absent"],
    default: "scheduled"
  },
  timing: {
    startTime: String, // e.g., "10:00"
    endTime: String,   // e.g., "11:00"
    duration: { type: Number, default: 60 } // minutes
  },
  subjects: [String], // subjects taught that day
  chapter: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },
  medium: {
    type: String,
    enum: ["hindi", "odia", "english"],
    required: true
  },
  schoolName: String,
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  ratings: {
    behavior: { type: Number, min: 1, max: 5 }, // teacher's behavior
    convenience: { type: Number, min: 1, max: 5 }, // ability to make understood
    overall: { type: Number, min: 1, max: 5 }
  },
  notes: String,
  teacherReachedAt: Date,
  sessionStartedAt: Date,
  sessionEndedAt: Date,
  isPaid: { type: Boolean, default: false },
  paymentAmount: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for student-teacher-date uniqueness
attendanceSchema.index({ student: 1, teacher: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);