const express = require("express");
const { sendMessage, getConversation, markAsRead} = require("../../controllers/message/message-controller.js");
const authMiddleware = require("../../helpers/authMiddleware.js");

const router = express.Router();

// Send message
router.post("/send", sendMessage);

// Get conversation between two users
router.get("/conversation/:userId1/:userId2", getConversation);

// Mark messages as read
router.patch("/mark-read", markAsRead);
module.exports = router;
