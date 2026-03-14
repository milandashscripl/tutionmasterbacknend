import express from "express";
import {
  getCourses,
  getCourse,
  createCourse
} from "../controllers/userController.js";

import authMiddleware from "./../midllewares/authMiddleware.js";
import upload from "./../midllewares/upload.js";

const router = express.Router();

router.get("/", getCourses);

router.get("/:id", getCourse);

router.post(
  "/",
  authMiddleware,
  upload.single("thumbnail"),
  createCourse
);

export default router;