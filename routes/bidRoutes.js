import express from "express";
import { protect } from "../midllewares/authMiddleware.js";
import {
  getAllStudents,
  placeBid,
  getTeacherBids,
  getStudentBids,
  respondToBid,
} from "../controllers/bidController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET ALL STUDENTS (for teachers to browse and bid)
router.get("/students", getAllStudents);

// PLACE A BID
router.post("/bid", placeBid);

// GET BIDS FOR TEACHER
router.get("/teacher-bids", getTeacherBids);

// GET BIDS FOR STUDENT
router.get("/student-bids", getStudentBids);

// RESPOND TO BID (ACCEPT/REJECT)
router.post("/respond", respondToBid);

export default router;