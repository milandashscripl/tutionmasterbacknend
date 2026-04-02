import mongoose from "mongoose";

const chapterSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  standard: { type: String, required: true }, // e.g., "10", "12"
  board: { type: String, required: true }, // e.g., "CBSE", "ICSE", "State Board"
  medium: {
    type: String,
    enum: ["hindi", "odia", "english"],
    required: true
  },
  chapterName: { type: String, required: true },
  chapterNumber: { type: Number, required: true },
  description: String,
  topics: [String], // subtopics within the chapter
  estimatedHours: { type: Number, default: 1 }, // hours needed to complete
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium"
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin who created
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound indexes
chapterSchema.index({ subject: 1, standard: 1, board: 1, medium: 1 });
chapterSchema.index({ chapterName: 1, subject: 1 });

export default mongoose.models.Chapter || mongoose.model("Chapter", chapterSchema);