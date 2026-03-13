import express from "express";

import {
  getCourses,
  createCourse,
  getCourse,
  uploadCourseContent,
  likeContent,
  dislikeContent
} from "../controllers/userController.js";

import upload from "./../midllewares/upload.js";
import authMiddleware from "./../midllewares/authMiddleware.js";

const router = express.Router();

// Get all courses
router.get("/", getCourses);

// Get single course
router.get("/:id", getCourse);

// Create course (teacher only)
router.post("/", authMiddleware, createCourse);

// Upload course content
router.post(
  "/:courseId/content",
  authMiddleware,
  upload.single("file"),
  uploadCourseContent
);

// Like content
router.post("/content/:contentId/like", authMiddleware, likeContent);

// Dislike content
router.post("/content/:contentId/dislike", authMiddleware, dislikeContent);

export default router;