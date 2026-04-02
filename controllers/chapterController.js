import Chapter from "../models/Chapter.js";
import ChapterProgress from "../models/ChapterProgress.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// Create new chapter (admin only)
export const createChapter = async (req, res) => {
  try {
    const { subject, standard, board, medium, chapterName, chapterNumber, description, topics, estimatedHours, difficulty } = req.body;

    // Check if chapter already exists
    const existingChapter = await Chapter.findOne({
      subject,
      standard,
      board,
      medium,
      chapterName
    });

    if (existingChapter) {
      return res.status(400).json({ message: "Chapter already exists" });
    }

    const chapter = new Chapter({
      subject,
      standard,
      board,
      medium,
      chapterName,
      chapterNumber,
      description,
      topics,
      estimatedHours,
      difficulty,
      createdBy: req.user.id
    });

    await chapter.save();

    res.status(201).json({
      message: "Chapter created successfully",
      chapter
    });
  } catch (error) {
    console.error("Create chapter error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all chapters with filters
export const getChapters = async (req, res) => {
  try {
    const { page = 1, limit = 20, subject, standard, board, medium, search } = req.query;

    let query = { isActive: true };

    if (subject) query.subject = subject;
    if (standard) query.standard = standard;
    if (board) query.board = board;
    if (medium) query.medium = medium;

    if (search) {
      query.$or = [
        { chapterName: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const chapters = await Chapter.find(query)
      .sort({ subject: 1, standard: 1, chapterNumber: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Chapter.countDocuments(query);

    res.json({
      chapters,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get chapters error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get chapter by ID
export const getChapterById = async (req, res) => {
  try {
    const { chapterId } = req.params;

    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    res.json({ chapter });
  } catch (error) {
    console.error("Get chapter by ID error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update chapter (admin only)
export const updateChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const updates = req.body;

    const chapter = await Chapter.findByIdAndUpdate(
      chapterId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    res.json({
      message: "Chapter updated successfully",
      chapter
    });
  } catch (error) {
    console.error("Update chapter error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete chapter (admin only)
export const deleteChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;

    const chapter = await Chapter.findByIdAndUpdate(
      chapterId,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    res.json({
      message: "Chapter deleted successfully"
    });
  } catch (error) {
    console.error("Delete chapter error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get unique subjects, standards, boards for filters
export const getChapterFilters = async (req, res) => {
  try {
    const subjects = await Chapter.distinct('subject', { isActive: true });
    const standards = await Chapter.distinct('standard', { isActive: true });
    const boards = await Chapter.distinct('board', { isActive: true });
    const mediums = await Chapter.distinct('medium', { isActive: true });

    res.json({
      filters: {
        subjects: subjects.sort(),
        standards: standards.sort(),
        boards: boards.sort(),
        mediums: mediums.sort()
      }
    });
  } catch (error) {
    console.error("Get chapter filters error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update chapter progress (teacher only)
export const updateChapterProgress = async (req, res) => {
  try {
    const { studentId, chapterId, status, progressPercentage, completedTopics, hoursSpent, grade, notes } = req.body;
    const teacherId = req.user.id;

    // Verify teacher-student relationship
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student' || student.assignedTeacher?.toString() !== teacherId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    let chapterProgress = await ChapterProgress.findOne({
      student: studentId,
      chapter: chapterId
    });

    if (!chapterProgress) {
      // Create new progress record
      chapterProgress = new ChapterProgress({
        student: studentId,
        teacher: teacherId,
        chapter: chapterId,
        status: status || 'in_progress',
        progressPercentage: progressPercentage || 0,
        completedTopics: completedTopics || [],
        hoursSpent: hoursSpent || 0,
        notes
      });
    } else {
      // Update existing progress
      chapterProgress.status = status || chapterProgress.status;
      chapterProgress.progressPercentage = progressPercentage !== undefined ? progressPercentage : chapterProgress.progressPercentage;
      chapterProgress.completedTopics = completedTopics || chapterProgress.completedTopics;
      chapterProgress.hoursSpent = hoursSpent !== undefined ? hoursSpent : chapterProgress.hoursSpent;
      chapterProgress.grade = grade || chapterProgress.grade;
      chapterProgress.notes = notes || chapterProgress.notes;
      chapterProgress.updatedAt = new Date();

      if (status === 'completed' && !chapterProgress.completionDate) {
        chapterProgress.completionDate = new Date();
      }
    }

    await chapterProgress.save();

    res.json({
      message: "Chapter progress updated successfully",
      chapterProgress
    });
  } catch (error) {
    console.error("Update chapter progress error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get chapter progress for student (student/teacher view)
export const getChapterProgress = async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check authorization
    if (userRole === 'student' && studentId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (userRole === 'teacher') {
      const student = await User.findById(studentId);
      if (!student || student.assignedTeacher?.toString() !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }

    const progress = await ChapterProgress.find({ student: studentId })
      .populate('chapter', 'chapterName subject standard board medium estimatedHours')
      .populate('teacher', 'name')
      .sort({ updatedAt: -1 });

    res.json({ progress });
  } catch (error) {
    console.error("Get chapter progress error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get chapter progress statistics
export const getChapterStats = async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check authorization
    if (userRole === 'student' && studentId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (userRole === 'teacher') {
      const student = await User.findById(studentId);
      if (!student || student.assignedTeacher?.toString() !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }

    const stats = await ChapterProgress.aggregate([
      { $match: { student: mongoose.Types.ObjectId(studentId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalHours: { $sum: "$hoursSpent" },
          avgProgress: { $avg: "$progressPercentage" }
        }
      }
    ]);

    const totalChapters = stats.reduce((sum, stat) => sum + stat.count, 0);
    const completedChapters = stats.find(s => s._id === 'completed')?.count || 0;
    const completionRate = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;

    res.json({
      stats,
      summary: {
        totalChapters,
        completedChapters,
        completionRate: Math.round(completionRate * 100) / 100,
        totalHoursSpent: stats.reduce((sum, stat) => sum + stat.totalHours, 0),
        averageProgress: stats.find(s => s._id === 'completed')?.avgProgress || 0
      }
    });
  } catch (error) {
    console.error("Get chapter stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};