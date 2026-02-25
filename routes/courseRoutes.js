import express from "express";
import authMiddleware from "../midllewares/authMiddleware.js";
import Course from "../models/Course.js";

const router = express.Router();

// Get all courses
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("instructor", "name email profileImage")
      .populate("enrolledStudents", "name email");

    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get courses enrolled by current user
router.get("/enrolled", authMiddleware, async (req, res) => {
  try {
    const courses = await Course.find({ enrolledStudents: req.user.id })
      .populate("instructor", "name email profileImage");

    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single course
router.get("/:courseId", async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .populate("instructor", "name email profileImage")
      .populate("enrolledStudents", "name email");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create course (instructor only)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, description, level, thumbnail, hours, price } = req.body;

    // Check if user is admin or instructor role
    if (req.user.role !== "instructor" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only instructors can create courses" });
    }

    const course = new Course({
      name,
      description,
      instructor: req.user.id,
      level,
      thumbnail,
      hours,
      price,
    });

    await course.save();
    const populatedCourse = await course.populate("instructor", "name email profileImage");

    res.status(201).json(populatedCourse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Enroll in course
router.post("/:courseId/enroll", authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check if already enrolled
    if (course.enrolledStudents.includes(req.user.id)) {
      return res.status(400).json({ message: "Already enrolled in this course" });
    }

    course.enrolledStudents.push(req.user.id);
    await course.save();

    const populatedCourse = await course.populate("instructor", "name email profileImage");

    res.status(200).json({ message: "Successfully enrolled", course: populatedCourse });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update course (instructor only)
router.put("/:courseId", authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.instructor.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { name, description, level, thumbnail, hours, price } = req.body;

    if (name) course.name = name;
    if (description) course.description = description;
    if (level) course.level = level;
    if (thumbnail) course.thumbnail = thumbnail;
    if (hours !== undefined) course.hours = hours;
    if (price !== undefined) course.price = price;

    await course.save();
    const populatedCourse = await course.populate("instructor", "name email profileImage");

    res.status(200).json(populatedCourse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete course (instructor only)
router.delete("/:courseId", authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.instructor.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Course.findByIdAndDelete(req.params.courseId);

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
