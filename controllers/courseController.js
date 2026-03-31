import Course from "../models/Course.js";
import User from "../models/User.js";

// CREATE A NEW COURSE
export const createCourse = async (req, res) => {
  try {
    const { title, description, subject, category, videos } = req.body;
    const teacherId = req.user._id;

    if (!title || !description || !subject) {
      return res.status(400).json({ message: "Title, description, and subject are required" });
    }

    const newCourse = new Course({
      teacher: teacherId,
      title,
      description,
      subject,
      category: category || "beginner",
      videos: videos || [],
      isPublished: true,
    });

    const savedCourse = await newCourse.save();
    const populatedCourse = await Course.findById(savedCourse._id).populate(
      "teacher",
      "fullName profilePic teacherDetails"
    );

    res.status(201).json(populatedCourse);
  } catch (err) {
    console.error("Course creation error:", err);
    res.status(500).json({ message: err.message || "Error creating course" });
  }
};

// GET ALL COURSES (with sorting by teacher rating)
export const getAllCourses = async (req, res) => {
  try {
    const { subject, search, sort } = req.query;
    let query = { isPublished: true, isActive: true };

    if (subject) query.subject = subject;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    let courses = await Course.find(query)
      .populate("teacher", "fullName profilePic teacherDetails")
      .sort({ createdAt: -1 });

    // Sort by teacher rating if specified
    if (sort === "topRated") {
      courses.sort((a, b) => b.averageRating - a.averageRating);
    }

    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET COURSES BY TEACHER
export const getCoursesByTeacher = async (req, res) => {
  try {
    const teacherId = req.params.teacherId;

    const courses = await Course.find({ teacher: teacherId })
      .populate("teacher", "fullName profilePic teacherDetails")
      .sort({ createdAt: -1 });

    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET SINGLE COURSE
export const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .populate("teacher", "fullName profilePic teacherDetails")
      .populate("comments.student", "fullName profilePic")
      .populate("reviews.student", "fullName");

    if (!course) return res.status(404).json({ message: "Course not found" });

    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE COURSE
export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) return res.status(404).json({ message: "Course not found" });
    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    Object.assign(course, req.body);
    await course.save();
    await course.populate("teacher", "fullName profilePic teacherDetails");

    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE COURSE
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) return res.status(404).json({ message: "Course not found" });
    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Course.findByIdAndDelete(req.params.courseId);
    res.json({ message: "Course deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADD VIDEO TO COURSE
export const addVideo = async (req, res) => {
  try {
    const { title, description, url, duration, type, thumbnail } = req.body;
    const course = await Course.findById(req.params.courseId);

    if (!course) return res.status(404).json({ message: "Course not found" });
    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    course.videos.push({
      title,
      description,
      url,
      duration,
      type,
      thumbnail,
    });

    await course.save();
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// LIKE COURSE
export const likeCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    const userId = req.user._id;

    if (!course) return res.status(404).json({ message: "Course not found" });

    // Remove from dislikes if present
    course.dislikedBy = course.dislikedBy.filter((id) => id.toString() !== userId.toString());
    if (course.dislikes > 0) course.dislikes--;

    // Add to likes if not already liked
    if (!course.likedBy.includes(userId)) {
      course.likedBy.push(userId);
      course.likes++;
    }

    await course.save();
    res.json({ likes: course.likes, dislikes: course.dislikes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DISLIKE COURSE
export const dislikeCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    const userId = req.user._id;

    if (!course) return res.status(404).json({ message: "Course not found" });

    // Remove from likes if present
    course.likedBy = course.likedBy.filter((id) => id.toString() !== userId.toString());
    if (course.likes > 0) course.likes--;

    // Add to dislikes if not already disliked
    if (!course.dislikedBy.includes(userId)) {
      course.dislikedBy.push(userId);
      course.dislikes++;
    }

    await course.save();
    res.json({ likes: course.likes, dislikes: course.dislikes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADD COMMENT
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const course = await Course.findById(req.params.courseId);
    const studentId = req.user._id;

    if (!course) return res.status(404).json({ message: "Course not found" });

    course.comments.push({
      student: studentId,
      text,
      createdAt: new Date(),
    });

    await course.save();
    await course.populate("comments.student", "fullName profilePic");

    res.json(course.comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// REPLY TO COMMENT
export const replyComment = async (req, res) => {
  try {
    const { text } = req.body;
    const { courseId, commentId } = req.params;
    const teacherId = req.user._id;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const comment = course.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    comment.replies.push({
      teacher: teacherId,
      text,
      createdAt: new Date(),
    });

    await course.save();
    res.json(comment.replies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADD REVIEW
export const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const course = await Course.findById(req.params.courseId);
    const studentId = req.user._id;

    if (!course) return res.status(404).json({ message: "Course not found" });
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // Check if student already reviewed
    const existingReview = course.reviews.find(
      (r) => r.student.toString() === studentId.toString()
    );

    if (existingReview) {
      existingReview.rating = rating;
      existingReview.comment = comment;
    } else {
      course.reviews.push({
        student: studentId,
        rating,
        comment,
        createdAt: new Date(),
      });
    }

    // Recalculate average rating
    const avgRating =
      course.reviews.reduce((sum, r) => sum + r.rating, 0) / course.reviews.length;
    course.averageRating = Math.round(avgRating * 10) / 10;
    course.totalReviews = course.reviews.length;

    // Update teacher's average rating
    const teacher = await User.findById(course.teacher);
    const allCourses = await Course.find({ teacher: course.teacher });
    const avgTeacherRating =
      allCourses.reduce((sum, c) => sum + (c.averageRating || 0), 0) / allCourses.length;

    teacher.teacherDetails.averageRating = Math.round(avgTeacherRating * 10) / 10;
    teacher.teacherDetails.totalReviews = allCourses.reduce(
      (sum, c) => sum + (c.totalReviews || 0),
      0
    );
    await teacher.save();

    await course.save();
    res.json({ success: true, averageRating: course.averageRating });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ENROLL STUDENT IN COURSE
export const enrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    const studentId = req.user._id;

    if (!course) return res.status(404).json({ message: "Course not found" });

    if (!course.enrolledBy.includes(studentId)) {
      course.enrolledBy.push(studentId);
      course.enrolledStudents++;
      await course.save();
    }

    res.json({ success: true, enrolledStudents: course.enrolledStudents });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
