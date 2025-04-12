const CollectionofUser = require("../../models/CollectionofUsers");
const PageOwner = require("../../models/PageUser"); // Import the PageOwner model
const mongoose = require('mongoose');
const nodemailer = require("nodemailer");


// Add userIds to a specific userId
const addUserIds = async (req, res) => {
  try {
    const { userId, targetUserId } = req.body;

    if (!userId || !targetUserId) {
      return res.status(400).json({ message: "Both userId and targetUserId are required" });
    }

    // Find both PageOwner documents
    const pageOwner = await PageOwner.findById(userId);
    const targetPageOwner = await PageOwner.findById(targetUserId);
    
    if (!pageOwner) {
      return res.status(404).json({ message: "PageOwner not found" });
    }
    if (!targetPageOwner) {
      return res.status(404).json({ message: "Target PageOwner not found" });
    }

    // Check if userA exists, otherwise create it
    let userA = await CollectionofUser.findOne({ userId });
    if (!userA) {
      userA = new CollectionofUser({ userId, collectionOfUserId: [] });
    }

    // Check if userB exists, otherwise create it
    let userB = await CollectionofUser.findOne({ userId: targetUserId });
    if (!userB) {
      userB = new CollectionofUser({ userId: targetUserId, collectionOfUserId: [] });
    }

    // Check if targetUserId is already in userA's collection
    const isAlreadyAdded = userA.collectionOfUserId.some(user => user.user.equals(targetUserId));
    if (!isAlreadyAdded) {
      if (pageOwner.linkCoins < 1) {
        return res.status(400).json({ message: "Insufficient LinkCoins" });
      }

      // Deduct 1 LinkCoin
      pageOwner.linkCoins -= 1;
      await pageOwner.save();

      // Add targetUserId to userA's collection
      userA.collectionOfUserId.push({ user: targetUserId, status: 'active' });
      await userA.save();

      // Add userId to userB's collection to make it bidirectional
      const isUserBAdded = userB.collectionOfUserId.some(user => user.user.equals(userId));
      if (!isUserBAdded) {
        userB.collectionOfUserId.push({ user: userId, status: 'active' });
        await userB.save();

        // Send email notification to target user
        try {
          const mailOptions = {
            from: 'support@promoterlink.com',
            to: targetPageOwner.email, // Assuming PageOwner has an email field
            subject: 'New Collaboration Request',
            html: `
<div style="
  font-family: 'Arial', sans-serif;
  max-width: 600px;
  margin: 0 auto;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0,0,0,0.1);
  border: 1px solid #e0e0e0;
">
  <!-- Header -->
  <div style="
    padding: 25px;
    background: linear-gradient(135deg, #4361ee, #3a0ca3);
    color: white;
    text-align: center;
  ">
    <h1 style="margin: 0; font-size: 24px;">New Collaboration on PromoterLink</h1>
  </div>
  
  <!-- Content -->
  <div style="padding: 30px; line-height: 1.6; color: #333333; background-color: #ffffff;">
    <p style="margin-bottom: 20px;">Dear ${targetPageOwner.ownerName},</p>
    
    <div style="
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
      border-left: 4px solid #4361ee;
    ">
      <p style="margin: 0; font-weight: bold; color: #4361ee;">
        ${pageOwner.ownerName} wants to collaborate with you!
      </p>
    </div>
    
    <p style="margin-bottom: 15px;">
      We're excited to inform you that <strong>${pageOwner.ownerName}</strong> has added you as a collaborator on PromoterLink.
    </p>
    
    <p style="margin-bottom: 15px;">
      This new connection opens up opportunities for mutual growth, collaboration, and networking. You can now communicate directly through our platform.
    </p>
    
    <div style="text-align: center; margin: 25px 0;">
      <a href="https://promoterlink.com" style="
        display: inline-block;
        padding: 12px 25px;
        background-color: #4361ee;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
      ">View Connection in Dashboard</a>
    </div>
    
    <p style="margin-bottom: 5px;">Best regards,</p>
    <p style="margin: 0; font-weight: bold;">The PromoterLink Team</p>
  </div>
  
  <!-- Footer -->
  <div style="
    padding: 15px;
    text-align: center;
    font-size: 12px;
    color: #777777;
    background-color: #f5f5f5;
  ">
    <p style="margin: 5px 0;">© ${new Date().getFullYear()} PromoterLink. All rights reserved.</p>
    <p style="margin: 5px 0;">
      <a href="https://promoterlink.com/privacy" style="color: #4361ee; text-decoration: none;">Privacy Policy</a> | 
      <a href="https://promoterlink.com/terms" style="color: #4361ee; text-decoration: none;">Terms of Service</a>
    </p>
  </div>
</div>
`
          };

          await transporter.sendMail(mailOptions);
          console.log(`Notification email sent to ${targetPageOwner.email}`);
        } catch (emailError) {
          console.error("Error sending email notification:", emailError);
          // Don't fail the whole operation if email fails
        }
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

const transporter = nodemailer.createTransport({
  host: "smtpout.secureserver.net",
  port: 465,
  secure: true,
  auth: {
    user: "support@promoterlink.com",
    pass: "Kiranmjv1027@",
  },
  tls: {
    rejectUnauthorized: false,
  },
});


const updateDate = async (userId, targetUserId) => {
  try {
    const currentDate = new Date();

    // First, find and update the initiating user's collection
    const userUpdate = await CollectionofUser.findOneAndUpdate(
      { 
        userId,
        "collectionOfUserId.user": targetUserId
      },
      {
        $set: {
          "collectionOfUserId.$.addedAt": currentDate,
          "collectionOfUserId.$.status": "active"
        }
      },
      { new: true }
    );

    // If no existing entry was found, push a new one
    if (!userUpdate) {
      await CollectionofUser.findOneAndUpdate(
        { userId },
        {
          $push: {
            collectionOfUserId: {
              user: targetUserId,
              addedAt: currentDate,
              status: "active"
            }
          }
        },
        { upsert: true, new: true }
      );
    }

    // Repeat the same for the target user's collection
    const targetUpdate = await CollectionofUser.findOneAndUpdate(
      { 
        userId: targetUserId,
        "collectionOfUserId.user": userId
      },
      {
        $set: {
          "collectionOfUserId.$.addedAt": currentDate,
          "collectionOfUserId.$.status": "active"
        }
      },
      { new: true }
    );

    if (!targetUpdate) {
      await CollectionofUser.findOneAndUpdate(
        { userId: targetUserId },
        {
          $push: {
            collectionOfUserId: {
              user: userId,
              addedAt: currentDate,
              status: "active"
            }
          }
        },
        { upsert: true, new: true }
      );
    }

    // Deduct LinkCoin from the initiating user
    const user = await PageOwner.findByIdAndUpdate(
      userId,
      { $inc: { linkCoins: -1 } },
      { new: true }
    );

    if (!user) {
      throw new Error("Initiating user not found");
    }

    if (user.linkCoins < 0) {
      throw new Error("Insufficient LinkCoins");
    }

    return {
      success: true,
      message: "Connection dates updated successfully",
      newDate: currentDate,
      linkCoinsRemaining: user.linkCoins
    };

  } catch (error) {
    console.error("Error in updateDate:", error.message);
    return {
      success: false,
      message: error.message
    };
  }
};

const renewConnection = async (req, res) => {
  try {
    const { userId, targetUserId } = req.body;
    
    const result = await updateDate(userId, targetUserId);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json({
      message: result.message,
      renewedAt: result.newDate,
      linkCoins: result.linkCoinsRemaining
    });

  } catch (error) {
    console.error("Error in renewConnection:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
 

// Remove userIds from a specific userId
const deleteUserIds = async (req, res) => {
  try {
    const { userId, targetUserId } = req.body;

    if (!userId || !targetUserId) {
      return res.status(400).json({ message: "Both userId and targetUserId are required" });
    }

    // Find the user's collection
    const user = await CollectionofUser.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User collection not found" });
    }

    // Check if the connection exists
    const initialCount = user.collectionOfUserId.length;
    user.collectionOfUserId = user.collectionOfUserId.filter(
      item => !item.user.equals(targetUserId)
    );

    if (user.collectionOfUserId.length === initialCount) {
      return res.status(404).json({ message: "Connection not found in user's collection" });
    }

    await user.save();

    res.json({
      message: "Connection removed successfully (unidirectional)",
      userId: user.userId,
      removedConnection: targetUserId,
      remainingConnections: user.collectionOfUserId.length
    });

  } catch (error) {
    console.error("Error in deleteUserIds:", error.message);
    res.status(500).json({ 
      message: "Internal Server Error", 
      error: error.message 
    });
  }
};


// Get all collections for a given userId
const getUserCollections = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId format" });
    }

    const user = await CollectionofUser.findOne({ userId })
      .populate({
        path: 'collectionOfUserId.user',
        model: 'PageOwner',
        select: 'ownerName profilePicUrl isOnline followers' // Add fields you need
      })
      .lean(); // Convert to plain JS object

    if (!user) {
      return res.status(404).json({ message: "No collections found" });
    }

    // Format the response data
    const formattedCollections = user.collectionOfUserId.map(item => ({
      _id: item._id,
      status: item.status,
      addedAt: item.addedAt,
      user: item.user || null // Handle cases where population failed
    }));
    //console.log(formattedCollections);
    res.json({
      message: "Collections retrieved successfully",
      collections: formattedCollections
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



module.exports = { addUserIds,renewConnection, deleteUserIds,getUserCollections };