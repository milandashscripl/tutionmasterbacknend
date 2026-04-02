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

    // Validate that only short videos are allowed
    if (videos && videos.length > 0) {
      const invalidVideos = videos.filter(video => video.type !== "short");
      if (invalidVideos.length > 0) {
        return res.status(400).json({
          message: "Only short videos (like Instagram or YouTube shorts) are allowed for courses at this time"
        });
      }
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
    console.log("Add video request received");
    console.log("Body:", req.body);
    console.log("File:", req.file ? "File present" : "No file");

    const { title, description, duration, type } = req.body;

    // Validate that only short videos are allowed
    if (type !== "short") {
      return res.status(400).json({
        message: "Only short videos (like Instagram or YouTube shorts) are allowed for courses at this time"
      });
    }

    // Relaxed validation: teacher may upload video with minimal metadata
    const videoTitle = title || "Untitled Video";
    const videoDescription = description || "";
    const videoDuration = parseInt(duration) || 0;
    const videoType = "short"; // Force to short

    const course = await Course.findById(req.params.courseId);

    if (!course) {
      console.log("Course not found:", req.params.courseId);
      return res.status(404).json({ message: "Course not found" });
    }
    if (course.teacher.toString() !== req.user._id.toString()) {
      console.log("Not authorized - course teacher:", course.teacher, "user:", req.user._id);
      return res.status(403).json({ message: "Not authorized" });
    }

    let videoUrl = "";
    let thumbnail = "";

    // Upload video to Cloudinary if file is provided
    if (req.file && req.file.buffer && process.env.CLOUDINARY_API_KEY) {
      console.log("Uploading to Cloudinary...");
      console.log("File size:", req.file.size, "bytes");
      console.log("File type:", req.file.mimetype);

      try {
        const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

        // First, try uploading without eager transformations
        const upload = await cloudinary.uploader.upload(dataUri, {
          folder: "course-videos",
          resource_type: "video"
        });

        videoUrl = upload.secure_url;

        // Generate thumbnail from the uploaded video
        thumbnail = cloudinary.url(upload.public_id, {
          resource_type: "video",
          width: 300,
          height: 200,
          crop: "fill",
          gravity: "auto",
          format: "jpg",
          quality: "auto"
        });

        console.log("Thumbnail generated:", thumbnail);

        console.log("Cloudinary upload successful:", videoUrl);
      } catch (cloudinaryError) {
        console.error("Cloudinary upload failed:", cloudinaryError);
        return res.status(500).json({ message: "Failed to upload video to cloud storage: " + cloudinaryError.message });
      }
    } else {
      console.log("No file provided or Cloudinary not configured");
      console.log("req.file:", !!req.file);
      console.log("req.file.buffer:", !!(req.file && req.file.buffer));
      console.log("CLOUDINARY_API_KEY:", !!process.env.CLOUDINARY_API_KEY);
      return res.status(400).json({ message: "Video file is required" });
    }

    course.videos.push({
      title: videoTitle,
      description: videoDescription,
      url: videoUrl,
      duration: videoDuration,
      type: videoType,
      thumbnail,
      uploadedAt: new Date(),
      viewCount: 0,
    });

    await course.save();
    console.log("Video added successfully to course");
    res.json(course);
  } catch (err) {
    console.error("Add video error:", err);
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

// TRACK VIDEO VIEW
export const trackVideoView = async (req, res) => {
  try {
    const { courseId, videoIndex } = req.params;
    const course = await Course.findById(courseId);

    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!course.videos[videoIndex]) return res.status(404).json({ message: "Video not found" });

    // Increment view count for the video
    if (!course.videos[videoIndex].viewCount) {
      course.videos[videoIndex].viewCount = 0;
    }
    course.videos[videoIndex].viewCount++;

    await course.save();
    res.json({ success: true, viewCount: course.videos[videoIndex].viewCount });
  } catch (err) {
    console.error("Track view error:", err);
    res.status(500).json({ message: err.message });
  }
};
