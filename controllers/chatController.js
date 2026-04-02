import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

// =============================
// Get all chats
// =============================
export const getChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: { $in: [req.user._id] } })
      .populate("participants", "fullName email profilePic")
      .populate("messages")
      .sort({ updatedAt: -1 });

    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =============================
// Create or get chat
// =============================
export const createOrGetChat = async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, otherUserId] },
    }).populate("participants", "fullName email profilePic");

    if (!chat) {
      const otherUser = await User.findById(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ message: "User not found" });
      }

      chat = await Chat.create({
        participants: [req.user._id, otherUserId],
        chatName: otherUser.fullName,
        messages: [],
      });

      chat = await chat.populate("participants", "fullName email profilePic");
    }

    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =============================
// Get messages
// =============================
export const getMessages = async (req, res) => {
  try {
    const chatId = req.params.chatId;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const messages = await Message.find({ chatId })
      .populate("sender", "fullName profilePic email")
      .sort({ timestamp: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =============================
// Send message
// =============================
export const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const chatId = req.params.chatId;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const message = await Message.create({
      chatId,
      sender: req.user._id,
      content: content.trim(),
    });

    chat.messages.push(message._id);
    await chat.save();

    const populatedMessage = await message.populate(
      "sender",
      "fullName profilePic email"
    );

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =============================
// Get chat by ID
// =============================
export const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate("participants", "fullName email profilePic")
      .populate("messages");

    if (!chat) return res.status(404).json({ message: "Chat not found" });

    if (!chat.participants.some(p => p._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =============================
// Mark as read
// =============================
export const markAsRead = async (req, res) => {
  try {
    const chatId = req.params.chatId;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Message.updateMany(
      { chatId, sender: { $ne: req.user._id }, read: false },
      { read: true }
    );

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};