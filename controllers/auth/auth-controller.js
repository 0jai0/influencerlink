const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/PageUser");
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// authController.js
const googleLogin = async (req, res) => {
  const { credential } = req.body;
  
  try {
    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID, // Your Google client ID
    });
    
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if doesn't exist
      user = new User({
        ownerName: name,
        email,
        password: googleId, // Store Google ID as password (you might want to handle this differently)
        role: 'influencer', // Default role
        isGoogleAuth: true // Flag to identify Google-authenticated users
      });
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        userName: user.ownerName,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "None" }).json({
      success: true,
      message: "Logged in successfully with Google.",
      token: token,
      user: {
        id: user._id,
        ownerName: user.ownerName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      message: "Google authentication failed.",
    });
  }
};
//register
const registerUser = async (req, res) => {
  const { ownerName, email, password, mobile, role } = req.body;

  try {
    // Convert email to lowercase for consistency
    const lowerCaseEmail = email.toLowerCase();

    // Check if the user already exists
    const checkUser = await User.findOne({ email: lowerCaseEmail });
    if (checkUser) {
      return res.json({
        success: false,
        message: "User already exists with the same email! Please try again.",
      });
    }

    // Validate role (ensure it's either 'influencer' or 'user')
    if (!['influencer', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Role must be either 'influencer' or 'user'.",
      });
    }

    // Hash password before saving
    const hashPassword = await bcrypt.hash(password, 12);

    // Create new user with role
    const newUser = new User({
      ownerName,
      email: lowerCaseEmail,
      password: hashPassword,
      mobile,
      role, // Store role
    });

    await newUser.save();

    // Respond with success message
    res.status(200).json({
      success: true,
      message: "User registered successfully!",
      data: {
        id: newUser._id,
        ownerName: newUser.ownerName,
        email: newUser.email,
        mobile: newUser.mobile,
        role: newUser.role, // Return role in response
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};




const updateUser = async (req, res) => {
  const { userId } = req.params; // User ID from URL parameter
  const {
    ownerName,
    mobile,
    whatsapp,
    socialMediaPlatforms,
    profileDetails,
    adCategories,
    pageContentCategory,
    pricing,
    pastPosts,
    profilePicUrl,
    averageAudienceType,
    averageLocationOfAudience,
  } = req.body;

  try {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user fields if provided
    if (ownerName) user.ownerName = ownerName;
    if (mobile) user.mobile = mobile;
    if (whatsapp) user.whatsapp = whatsapp;
    if (profilePicUrl) user.profilePicUrl = profilePicUrl;
    
    if (socialMediaPlatforms && socialMediaPlatforms.length > 0) {
      user.socialMediaPlatforms = socialMediaPlatforms;
    }
    
    if (profileDetails && profileDetails.length > 0) {
      user.profileDetails = profileDetails.map((detail, index) => ({
        platform: detail.platform || user.profileDetails[index]?.platform,
        profileName: detail.profileName || user.profileDetails[index]?.profileName,
        profilePicUrl: detail.profilePicUrl || user.profileDetails[index]?.profilePicUrl,
        profileDashboardPic: detail.profileDashboardPic || user.profileDetails[index]?.profileDashboardPic,
        followers: detail.followers || user.profileDetails[index]?.followers,
        verified: detail.verified !== undefined ? detail.verified : user.profileDetails[index]?.verified,
      }));
    }

    if (adCategories && adCategories.length > 0) {
      user.adCategories = adCategories;
    }
    
    if (pageContentCategory && pageContentCategory.length > 0) {
      user.pageContentCategory = pageContentCategory;
    }
    
    if (averageAudienceType && averageAudienceType.length > 0) {
      user.averageAudienceType = averageAudienceType;
    }

    if (averageLocationOfAudience && averageLocationOfAudience.length > 0) {
      user.averageLocationOfAudience = averageLocationOfAudience;
    }

    if (pricing) {
      user.pricing = {
        storyPost: pricing.storyPost || user.pricing.storyPost,
        feedPost: pricing.feedPost || user.pricing.feedPost,
        reel: pricing.reel || user.pricing.reel,
      };
    }

    if (pastPosts && pastPosts.length > 0) {
      user.pastPosts = pastPosts;
    }

    // Save updated user details
    await user.save();

    res.status(200).json({
      success: true,
      message: "User details updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the user",
    });
  }
};



//login
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const lowerCaseEmail = email.toLowerCase();
    const checkUser = await User.findOne({ email: lowerCaseEmail });

    if (!checkUser) {
      return res.json({
        success: false,
        message: "User doesn't exist! Please register first.",
      });
    }

    const checkPasswordMatch = await bcrypt.compare(password, checkUser.password);
    if (!checkPasswordMatch) {
      return res.json({
        success: false,
        message: "Incorrect password! Please try again.",
      });
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: checkUser._id,
        role: checkUser.role,
        email: checkUser.email,
        userName: checkUser.ownerName, // Ensure it's `ownerName` since your schema uses this
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Set the token in cookies
    res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "None" }).json({
      success: true,
      message: "Logged in successfully.",
      token: token,
      user: {
        id: checkUser._id,
        ownerName: checkUser.ownerName,
        email: checkUser.email,
        role: checkUser.role, // Explicitly return role
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      message: "Some error occurred.",
    });
  }
};





const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Exclude password
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    // Check if the email exists in the database
    const lowerCaseEmail = email.toLowerCase();
    const user = await User.findOne({ email: lowerCaseEmail  });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with this email address!",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the password in the database
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been updated successfully!",
    });
  } catch (error) {
    console.error("Forgot Password Error: ", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

//logout

const logoutUser = (req, res) => {
  res.clearCookie("token").json({
    success: true,
    message: "Logged out successfully!",
  });
};

//auth middleware
const authMiddleware = (req, res, next) => {
  let token = req.cookies.token; // Get token from cookie

  // If token is not in cookies, check Authorization header
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1]; // Extract token after "Bearer "
    }
  }

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};



module.exports = {getUserById,getAllUsers, googleLogin,updateUser,registerUser, loginUser, logoutUser, authMiddleware,forgotPassword };
