import mongoose from "mongoose";

const sessionScheduleSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subject: { type: String, required: true },
  chapter: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" }, // optional, for specific chapter work
  dayOfWeek: {
    type: String,
    enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    required: true
  },
  startTime: { type: String, required: true }, // HH:MM format
  endTime: { type: String, required: true }, // HH:MM format
  duration: { type: Number, required: true }, // minutes
  isActive: { type: Boolean, default: true },
  recurring: { type: Boolean, default: true }, // weekly recurring
  location: {
    type: {
      type: String,
      enum: ["student_home", "teacher_home", "online"],
      default: "student_home"
    }
  },
  medium: {
    type: String,
    enum: ["hindi", "odia", "english"],
    required: true
  },
  notes: String, // special instructions or notes
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who created the schedule
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
sessionScheduleSchema.index({ student: 1, dayOfWeek: 1 });
sessionScheduleSchema.index({ teacher: 1, dayOfWeek: 1 });
sessionScheduleSchema.index({ student: 1, teacher: 1, isActive: 1 });

export default mongoose.models.SessionSchedule || mongoose.model("SessionSchedule", sessionScheduleSchema);