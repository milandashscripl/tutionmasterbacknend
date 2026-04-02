import express from "express";
import auth from "../midllewares/authMiddleware.js";
import { allowRoles } from "../midllewares/roleMiddleware.js";
import upload from "../midllewares/upload.js";
import {
  getProfile,
  updateProfile,
  deleteUser,
  updateUserSettings,
  getAllUsers,
  getMatchedTeachers,
  hireTeacher,
  rateTeacher,
  getTeacherReviews,
  getPaymentSummary,
  setTeacherActiveStatus,
  checkPayers,
  purchaseMembership,
  getTeacherSuggestions
} from "../controllers/userController.js";

const router = express.Router();

router.get("/", auth, getAllUsers);
router.get("/me", auth, getProfile);
router.put("/me", auth, upload.single("profilePic"), updateProfile);
router.put("/settings", auth,   updateUserSettings);
router.delete("/me", auth, deleteUser);
// Add this line (ensure it's after the 'auth' middleware)
router.get("/matches", auth, getMatchedTeachers);
router.post("/membership", auth, purchaseMembership);
router.get("/suggestions", auth, getTeacherSuggestions);

// Add these lines for hiring and rating teachers
router.post("/hire", auth, hireTeacher);
router.post("/rate", auth, rateTeacher);
router.get("/reviews/:teacherId", auth, getTeacherReviews);

// Admin payment and status tracking
router.get("/payments/summary", auth, allowRoles("admin"), getPaymentSummary);
router.put("/teacher/:teacherId/status", auth, allowRoles("admin"), setTeacherActiveStatus);
router.post("/payments/check", auth, allowRoles("admin"), checkPayers);

export default router;