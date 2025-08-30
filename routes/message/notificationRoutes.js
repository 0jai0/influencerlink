const express = require("express");
const router = express.Router();
const controller = require("../../controllers/message/notificationController");

router.post("/token/store", controller.storeUserFCMToken);
router.get("/token/:userId", controller.getUserToken);

router.post("/send", controller.sendNotification);
router.get("/:userId", controller.getUserNotifications);
router.put("/read", controller.markNotificationAsRead);

module.exports = router;
