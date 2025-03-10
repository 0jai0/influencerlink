const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/PageUser");
const mongoose = require('mongoose');
//register
const registerUser = async (req, res) => {
  const { ownerName, email, password, mobile } = req.body;

  try {
    const lowerCaseEmail = email.toLowerCase();
    const checkUser = await User.findOne({ email: lowerCaseEmail });
    if (checkUser) {
      return res.json({
        success: false,
        message: "User already exists with the same email! Please try again.",
      });
    }

    const hashPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      ownerName: ownerName,
      email: lowerCaseEmail, // Save email in lowercase
      password: hashPassword,
      mobile,
    });

    await newUser.save();
    res.status(200).json({
      success: true,
      message: "User registered successfully!",
      data: {
        id: newUser._id,
        ownerName: newUser.ownerName,
        email: newUser.email,
        mobile: newUser.mobile,
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
      user.profileDetails = profileDetails;
    }
    if (adCategories && adCategories.length > 0) {
      user.adCategories = adCategories;
    }
    if (pageContentCategory && pageContentCategory.length > 0) {
      user.pageContentCategory = pageContentCategory;
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
    if (!checkUser)
      
      return res.json({
    
        success: false,
        message: "User doesn't exists! Please register first",
      });
    const checkPasswordMatch = await bcrypt.compare(
      password,
      checkUser.password
    );
    if (!checkPasswordMatch)
      return res.json({
        success: false,
        message: "Incorrect password! Please try again",
      });
    const token = jwt.sign(
      {
        id: checkUser._id,
        role: checkUser.role,
        email: checkUser.email,
        userName: checkUser.userName,
      },
      process.env.JWT_SECRET,
      { expiresIn: "6000m" }
    );
    res.cookie("token", token, { httpOnly: true, secure: false }).json({
      success: true,
      token: token,
      message: "Logged in successfully",
      user:checkUser,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured",
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
const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token)
    return res.status(401).json({
      success: false,
      message: "Unauthorised user!",
    });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Unauthorised user!",
    });
  }
};

module.exports = {getUserById,getAllUsers, updateUser,registerUser, loginUser, logoutUser, authMiddleware,forgotPassword };
