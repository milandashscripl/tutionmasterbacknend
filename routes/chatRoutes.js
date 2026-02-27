import express from "express";
import authMiddleware from "../midllewares/authMiddleware.js";
import {
  getChats,
  createOrGetChat,
  getMessages,
  sendMessage,
  getChatById,
  markAsRead,
} from "../controllers/chatController.js";

const router = express.Router();

router.get("/", authMiddleware, getChats);
router.post("/user/:userId", authMiddleware, createOrGetChat);
router.get("/:chatId/messages", authMiddleware, getMessages);
router.post("/:chatId/messages", authMiddleware, sendMessage);
router.get("/:chatId", authMiddleware, getChatById);
router.put("/:chatId/mark-read", authMiddleware, markAsRead);

export default router;