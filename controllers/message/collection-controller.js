const CollectionofUser = require("../../models/CollectionofUsers");
const PageOwner = require("../../models/PageUser"); // Import the PageOwner model
const mongoose = require('mongoose');


// Add userIds to a specific userId
const addUserIds = async (req, res) => {
  try {
    const { userId, targetUserId } = req.body; // Get both userId and targetUserId from the request body

    if (!userId || !targetUserId) {
      return res.status(400).json({ message: "Both userId and targetUserId are required" });
    }

    // Find the PageOwner document
    const pageOwner = await PageOwner.findOne({ _id: userId });
    if (!pageOwner) {
      return res.status(404).json({ message: "PageOwner not found" });
    }

    // Check if the targetUserId is already in the collection
    let userA = await CollectionofUser.findOne({ userId });
    if (!userA) {
      userA = new CollectionofUser({ userId, collectionOfUserId: [] });
    }

    let userB = await CollectionofUser.findOne({ userId: targetUserId });
    if (!userB) {
      userB = new CollectionofUser({ userId: targetUserId, collectionOfUserId: [] });
    }

    // Check if the targetUserId is already in userA's collection
    if (!userA.collectionOfUserId.includes(targetUserId)) {
      if (pageOwner.linkCoins < 1) {
        return res.status(400).json({ message: "Insufficient LinkCoins" });
      }

      // Deduct 1 LinkCoin
      pageOwner.linkCoins -= 1;
      await pageOwner.save();

      // Add targetUserId to userA's collection
      userA.collectionOfUserId.push(targetUserId);
      await userA.save();

      // Add userId to userB's collection to make it bidirectional
      if (!userB.collectionOfUserId.includes(userId)) {
        userB.collectionOfUserId.push(userId);
        await userB.save();
      }
    }

    res.json({
      message: "Target User ID added successfully",
      userA,
      userB,
      linkCoins: pageOwner.linkCoins,
    });
  } catch (error) {
    console.error("Error in addUserIds:", error.message);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};



// Remove userIds from a specific userId
const deleteUserIds = async (req, res) => {
  try {
    const { userId, targetUserId } = req.body; // Get userId and targetUserId from the request body

    if (!userId || !targetUserId) {
      return res.status(400).json({ message: "Both userId and targetUserId are required" });
    }

    const user = await CollectionofUser.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove targetUserId from the collection
    user.collectionOfUserId = user.collectionOfUserId.filter(
      (id) => id.toString() !== targetUserId
    );

    await user.save();

    res.json({ message: "Target User ID removed successfully", user });
  } catch (error) {
    console.error("Error in deleteUserIds:", error.message);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


// Get all collections for a given userId
const getUserCollections = async (req, res) => {
  try {
    const { userId } = req.params; // Get userId from the request parameters

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Find the user's collection
    const user = await CollectionofUser.findOne({ userId }).populate("collectionOfUserId");

    if (!user) {
      return res.status(404).json({ message: "User not found or has no collections" });
    }

    // Return the user's collections
    res.json({ message: "User collections retrieved successfully", collections: user.collectionOfUserId });
  } catch (error) {
    console.error("Error in getUserCollections:", error.message);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};



module.exports = { addUserIds, deleteUserIds,getUserCollections };