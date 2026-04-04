import express from "express";
import {
  createPayment,
  processPayment,
  getStudentPayments,
  getTeacherPayments,
  getPaymentStats,
  markPaymentOverdue,
  createPremiumPayment
} from "../controllers/paymentController.js";
import { protect } from "../midllewares/authMiddleware.js";
import { allowRoles } from "../midllewares/roleMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Teacher routes
router.post("/create", allowRoles("teacher"), createPayment);
router.get("/teacher", allowRoles("teacher"), getTeacherPayments);
router.put("/:paymentId/overdue", allowRoles("teacher"), markPaymentOverdue);

// Student routes
router.post("/process", allowRoles("student"), processPayment);
router.post("/premium", allowRoles("student", "teacher"), createPremiumPayment);
router.get("/student", allowRoles("student"), getStudentPayments);

// Common routes
router.get("/stats", getPaymentStats);

export default router;