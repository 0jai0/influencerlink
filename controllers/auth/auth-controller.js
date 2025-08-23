const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/PageUser");
const InstaOtp = require('../../models/InstaOtp');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const nodemailer = require("nodemailer");


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
        userName: checkUser.ownerName,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Convert Mongoose document to plain object and remove password
    const userObject = checkUser.toObject();
    delete userObject.password;

    // Set the token in cookies
    res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "None" }).json({
      success: true,
      message: "Logged in successfully.",
      token: token,
      user: userObject // Return all user data without password
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const searchTerm = req.query.search?.trim() || '';

    // Base query with role fixed as 'influencer'
    let query = { role: 'influencer' };

    // 🔍 Apply search filter
    if (searchTerm) {
      const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 2);
      if (searchWords.length > 0) {
        const regexArray = searchWords.map(word => new RegExp(word, 'i'));

        query.$or = [
          { ownerName: { $in: regexArray } },
          { email: { $in: regexArray } },
          { 'profileDetails.profileName': { $in: regexArray } },
          { adCategories: { $in: regexArray } },
          { pageContentCategory: { $in: regexArray } },
          { averageAudienceType: { $in: regexArray } },
          { averageLocationOfAudience: { $in: regexArray } },
          { 'pastPosts.category': { $in: regexArray } }
        ];
      }
    }

    // 📌 Apply additional filters dynamically
    const filterFields = [
      "adCategories",
      "pageContentCategory",
      "socialMediaPlatforms",
      "averageAudienceType",
      "averageLocationOfAudience"
    ];

    filterFields.forEach(field => {
      if (req.query[field]) {
        query[field] = { $in: req.query[field].split(",") };
      }
    });

    // 🔢 Followers range filter
    if (req.query.minFollowers || req.query.maxFollowers) {
      query["profileDetails.followers"] = {
        ...(req.query.minFollowers && { $gte: parseInt(req.query.minFollowers) }),
        ...(req.query.maxFollowers && { $lte: parseInt(req.query.maxFollowers) })
      };
    }

    // 💰 Pricing range filter
    if (req.query.minPrice || req.query.maxPrice) {
      query["pricing"] = {
        ...(req.query.minPrice && { $gte: parseFloat(req.query.minPrice) }),
        ...(req.query.maxPrice && { $lte: parseFloat(req.query.maxPrice) })
      };
    }

    // 🔄 Fetch users & count total users
    const users = await User.find(query).select('-password').skip(skip).limit(limit);
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
      success: true,
      page,
      totalPages,
      totalUsers,
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




// Generate random 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Store OTP with userId and status
const storeOtp = async (req, res) => {
  try {
    const { userId, profileName,profileUrl } = req.body;
    
    if (!userId || !profileName || !profileUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both userId and profileName are required' 
      });
    }

    const otpCode = generateOTP();
    
    // Create or update OTP record
    const otp = await InstaOtp.findOneAndUpdate(
      { userId, profileName,profileUrl },
      { 
        otp: otpCode,
        status: 'pending',
        createdAt: new Date() // Reset expiration timer
      },
      { 
        new: true, 
        upsert: true 
      }
    );

    res.status(200).json({ 
      success: true, 
      message: 'OTP stored successfully',
      otp: otpCode, // Returning OTP for testing (remove in production)
      record: otp
    });
  } catch (error) {
    console.error('Error storing OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to store OTP' 
    });
  }
};

// Get OTP by userId
const getOtpByUserId = async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    const otpRecord = await InstaOtp.findOne({ userId });
    
    if (!otpRecord) {
      return res.status(404).json({ 
        success: false, 
        message: 'No OTP found for this user ID' 
      });
    }

    res.status(200).json({ 
      success: true,
      userId: otpRecord.userId,
      profileName: otpRecord.profileName,
      otp: otpRecord.otp,
      status: otpRecord.status,
      createdAt: otpRecord.createdAt
    });
  } catch (error) {
    console.error('Error fetching OTP by userId:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve OTP' 
    });
  }
};

// Get OTP by profileName
const getOtpByProfileName = async (req, res) => {
  try {
    const { profileName } = req.query;
    
    if (!profileName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Profile name is required' 
      });
    }

    const otpRecord = await InstaOtp.findOne({ profileName });
    
    if (!otpRecord) {
      return res.status(404).json({ 
        success: false, 
        message: 'No OTP found for this profile name' 
      });
    }

    res.status(200).json({ 
      success: true,
      userId: otpRecord.userId,
      profileName: otpRecord.profileName,
      otp: otpRecord.otp,
      status: otpRecord.status,
      createdAt: otpRecord.createdAt
    });
  } catch (error) {
    console.error('Error fetching OTP by profileName:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve OTP' 
    });
  }
};


const updateStatusToSend = async (req, res) => {
  try {
    const { userId, status } = req.body;

    // Find the user details first (assuming you have a User model)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update the OTP status
    const updatedOtp = await InstaOtp.findOneAndUpdate(
      { userId: userId },
      { status: status },
      { new: true }
    );

    if (!updatedOtp) {
      return res.status(404).json({
        success: false,
        message: 'OTP record not found'
      });
    }

    // Send email notification
    try {
      const mailOptions = {
        from: 'support@promoterlink.com',
        to: user.email,
        subject: 'Instagram Verification Code Sent',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <div style="padding: 20px; background: linear-gradient(to right, #1FFFE0, #249BCA); color: white; text-align: center;">
              <h1>Verification Code Sent</h1>
            </div>
            <div style="padding: 20px; line-height: 1.6; color: #333;">
              <p>Hello ${user.ownerName || 'User'},</p>
              <p>We have sent a verification code to your Instagram DM from our official page <strong>@promoterlink_offlical</strong>.</p>
              
              <p style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #249BCA;">
                <strong>Please check your Instagram Direct Messages</strong> to verify your account.
              </p>
              
              <p>If you didn't receive the message:</p>
              <ul>
                <li>Check your message requests on Instagram</li>
                <li>Make sure you're following @promoterlink_offlical</li>
                <li>Wait a few minutes and check again</li>
              </ul>
              
              <p>Best regards,<br>
              The PromoterLink Team</p>
            </div>
            <div style="padding: 15px; text-align: center; font-size: 12px; color: #777; background-color: #f5f5f5;">
              <p>© ${new Date().getFullYear()} PromoterLink. All rights reserved.</p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Continue even if email fails
    }

    return res.status(200).json({
      success: true,
      message: `Status updated to "${status}" successfully and notification sent`,
      data: updatedOtp
    });
  } catch (error) {
    console.error('Error updating status to send:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// @desc    Get all OTP records
// @route   GET /api/pageowners/otp/get-all
// @access  Private/Admin
const getAllOtp = async (req, res) => {
  try {
    // Extract query parameters
    const { 
      page = 1, 
      limit = 10,
      status,
      userId,
      profileName,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;
    if (profileName) filter.profileName = { $regex: profileName, $options: 'i' };

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const otps = await InstaOtp.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((page - 1) * limit)
      .select('-__v') // Exclude version key
      .lean();

    // Get total count for pagination info
    const total = await InstaOtp.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: otps,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching OTPs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch OTP records',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



module.exports = {getUserById,getAllUsers, googleLogin,updateUser,registerUser, loginUser, logoutUser, authMiddleware,forgotPassword,storeOtp,
  getOtpByUserId,
  getOtpByProfileName,updateStatusToSend,getAllOtp };
