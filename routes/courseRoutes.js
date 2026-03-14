import express from "express";
import {
  getCourses,
  getCourse,
  createCourse,
  likeCourse,
  dislikeCourse,
  addComment
} from "../controllers/userController.js";

import authMiddleware from "../midllewares/authMiddleware.js";
import upload from "../midllewares/upload.js";

const router = express.Router();

router.get("/", getCourses);
router.get("/:id", getCourse);

router.post(
  "/",
  authMiddleware,
  upload.single("thumbnail"),
  createCourse
);

router.post("/:id/like", authMiddleware, likeCourse);
router.post("/:id/dislike", authMiddleware, dislikeCourse);
router.post("/:id/comment", authMiddleware, addComment);

export default router;