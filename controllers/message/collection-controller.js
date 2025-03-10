const CollectionofUser = require("../../models/CollectionofUsers");

// Add userIds to a specific userId
const addUserIds = async (req, res) => {
  try {
    const { userId, targetUserId } = req.body; // Get both userId and targetUserId from the request body

    if (!userId || !targetUserId) {
      return res.status(400).json({ message: "Both userId and targetUserId are required" });
    }

    let user = await CollectionofUser.findOne({ userId });
    if (!user) {
      // Create a new document if it doesn't exist
      user = new CollectionofUser({ userId, collectionOfUserId: [] });
    }

    // Add targetUserId to the collection, ensuring uniqueness
    if (!user.collectionOfUserId.includes(targetUserId)) {
      user.collectionOfUserId.push(targetUserId);
    }

    await user.save();

    res.json({ message: "Target User ID added successfully", user });
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