import express from "express";
import authMiddleware from "../midllewares/authMiddleware.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const router = express.Router();

// Get all chats for current user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user.id })
      .populate("participants", "name email profileImage")
      .populate("messages")
      .sort({ updatedAt: -1 });

    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or get existing chat with another user
router.post("/user/:userId", authMiddleware, async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, otherUserId] },
    }).populate("participants", "name email profileImage");

    if (!chat) {
      // Create new chat
      const otherUser = await User.findById(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ message: "User not found" });
      }

      chat = new Chat({
        participants: [req.user.id, otherUserId],
        chatName: otherUser.name,
        messages: [],
      });
      await chat.save();
      chat = await chat.populate("participants", "name email profileImage");
    }

    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get messages for a chat
router.get("/:chatId/messages", authMiddleware, async (req, res) => {
  try {
    const chatId = req.params.chatId;

    // Verify user is part of this chat
    const chat = await Chat.findById(chatId);
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const messages = await Message.find({ chatId })
      .populate("sender", "name profileImage email")
      .sort({ timestamp: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send a message
router.post("/:chatId/messages", authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const chatId = req.params.chatId;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }

    // Verify user is part of this chat
    const chat = await Chat.findById(chatId);
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Create message
    const message = new Message({
      chatId,
      sender: req.user.id,
      content: content.trim(),
    });

    await message.save();
    chat.messages.push(message._id);
    await chat.save();

    const populatedMessage = await message.populate(
      "sender",
      "name profileImage email"
    );

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get chat by ID
router.get("/:chatId", authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate("participants", "name email profileImage")
      .populate("messages");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Verify user is part of this chat
    if (!chat.participants.some((p) => p._id.toString() === req.user.id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark messages as read
router.put("/:chatId/mark-read", authMiddleware, async (req, res) => {
  try {
    const chatId = req.params.chatId;

    // Verify user is part of this chat
    const chat = await Chat.findById(chatId);
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Mark all messages from others as read
    await Message.updateMany(
      { chatId, sender: { $ne: req.user.id }, read: false },
      { read: true }
    );

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
