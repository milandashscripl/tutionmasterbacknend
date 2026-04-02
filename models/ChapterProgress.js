import mongoose from "mongoose";

const chapterProgressSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  chapter: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", required: true },
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed", "dropped"],
    default: "not_started"
  },
  progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
  completedTopics: [String], // topics completed within the chapter
  totalSessions: { type: Number, default: 0 }, // sessions spent on this chapter
  hoursSpent: { type: Number, default: 0 }, // actual hours spent
  estimatedHours: { type: Number, default: 1 }, // from chapter model
  startDate: Date,
  completionDate: Date,
  grade: {
    type: String,
    enum: ["A+", "A", "B+", "B", "C+", "C", "D", "F"],
    default: null
  },
  notes: String, // teacher notes on student performance
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
chapterProgressSchema.index({ student: 1, chapter: 1 }, { unique: true });
chapterProgressSchema.index({ teacher: 1, status: 1 });
chapterProgressSchema.index({ chapter: 1, status: 1 });

export default mongoose.models.ChapterProgress || mongoose.model("ChapterProgress", chapterProgressSchema);