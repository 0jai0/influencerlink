const express = require("express");
const { sendMessage,storeUserFCMToken  } = require("../../controllers/message/notificationController");

const router = express.Router();

// Route to send message and notification
router.post("/send-message", sendMessage);
router.post("/store-token", storeUserFCMToken);

module.exports = router;
