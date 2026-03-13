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
} from "./../controllers/userController.js";

import { protect } from "../midllewares/authMiddleware.js";

const router = express.Router();

const upload = multer();

router.get("/", getCourses);

router.get("/:id", getCourse);

router.post("/", protect, upload.single("thumbnail"), createCourse);

router.post(
"/:courseId/content",
protect,
upload.single("file"),
uploadCourseContent
);

router.post("/content/:contentId/like", protect, likeContent);

router.post("/content/:contentId/dislike", protect, dislikeContent);

router.post("/content/:contentId/comment", protect, commentContent);

export default router;