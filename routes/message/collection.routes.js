const express = require("express");
const {  addUserIds,renewConnection,deleteUserIds,getUserCollections} = require("../../controllers/message/collection-controller");

const router = express.Router();

// Route to add userIds to a specific userId
router.post("/users/add", addUserIds);

// Route to remove a target user ID from a user's collection
router.post("/users/remove", deleteUserIds);

router.post("/users/update", renewConnection);

// Route to get all collections for a given userId
router.get("/users/:userId", getUserCollections);

module.exports = router;