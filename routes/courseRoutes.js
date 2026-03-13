import express from "express";
import multer from "multer";

import {
  getCourses,
  getCourse,
  createCourse,
  uploadCourseContent,
  likeContent,
  dislikeContent,
  commentContent
} from "../controllers/courseController.js";

import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

const upload = multer();

// get all courses
router.get("/", getCourses);

// get single course
router.get("/:id", getCourse);

// create course
router.post("/", protect, upload.single("thumbnail"), createCourse);

// upload content
router.post(
  "/:courseId/content",
  protect,
  upload.single("file"),
  uploadCourseContent
);

// like
router.post("/like/:contentId", protect, likeContent);

// dislike
router.post("/dislike/:contentId", protect, dislikeContent);

// comment
router.post("/comment/:contentId", protect, commentContent);

export default router;