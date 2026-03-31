import express from "express";
import * as courseController from "../controllers/courseController.js";
import { protect } from "../midllewares/authMiddleware.js";
import upload from "../midllewares/upload.js";

const router = express.Router();

// PUBLIC ROUTES
router.get("/", courseController.getAllCourses);
router.get("/teacher/:teacherId", courseController.getCoursesByTeacher);
router.get("/:courseId", courseController.getCourse);

// PROTECTED ROUTES - Teacher Only
router.post("/", protect, courseController.createCourse);
router.put("/:courseId", protect, courseController.updateCourse);
router.delete("/:courseId", protect, courseController.deleteCourse);
router.post("/:courseId/video", protect, upload.single("video"), courseController.addVideo);

// ENGAGEMENT - All Users
router.post("/:courseId/like", protect, courseController.likeCourse);
router.post("/:courseId/dislike", protect, courseController.dislikeCourse);
router.post("/:courseId/comment", protect, courseController.addComment);
router.post("/:courseId/comment/:commentId/reply", protect, courseController.replyComment);
router.post("/:courseId/review", protect, courseController.addReview);
router.post("/:courseId/enroll", protect, courseController.enrollCourse);

export default router;
