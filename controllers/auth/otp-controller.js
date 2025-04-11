const Otp = require("../../models/Otp");
const PageOwner = require("../../models/PageUser");
const nodemailer = require("nodemailer");
require("dotenv").config(); 

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

  const sendOtpforFP = async (req, res) => {
    const { userId } = req.body;

    try {
        const user = await PageOwner.findOne({email:userId});
        if (!user) {
            return res.status(404).json({ success: false, message: "Email Not registered. Please register instead." });
        }

        // Generate a random 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000); // Ensures a 4-digit OTP

        // Save OTP in the database
        await Otp.findOneAndUpdate(
            { userId },
            { otp, status: "stored", createdAt: new Date() },
            { upsert: true, new: true }
        );

        // Email content
        const mailOptions = {
            from: '"PromoterLink Support" <support@promoterlink.com>',
            to: userId,
            subject: 'Your OTP for PromoterLink Change Password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2BFFF8;">PromoterLink </h2>
                    <p>Your One-Time Password (OTP) for Change Password is:</p>
                    <h3 style="background: #59FFA7; display: inline-block; padding: 10px 20px; border-radius: 5px;">
                        ${otp}
                    </h3>
                    <p>This OTP is valid for 15 minutes. Please do not share it with anyone.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <hr>
                    <p>Best regards,<br>The PromoterLink Team</p>
                </div>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);

        // TODO: Send OTP to the user via email/SMS (not implemented here)

        res.json({ success: true, message: "OTP sent successfully!", otp }); // Sending OTP for testing (remove in production)
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// Store OTP
const sendOtp = async (req, res) => {
    const { userId } = req.body;

    try {
        const user = await PageOwner.findOne({email:userId});
        if (user) {
            return res.status(404).json({ success: false, message: "Email already registered. Please login instead." });
        }

        // Generate a random 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000); // Ensures a 4-digit OTP

        // Save OTP in the database
        await Otp.findOneAndUpdate(
            { userId },
            { otp, status: "stored", createdAt: new Date() },
            { upsert: true, new: true }
        );

        // Email content
        const mailOptions = {
            from: '"PromoterLink Support" <support@promoterlink.com>',
            to: userId,
            subject: 'Your OTP for PromoterLink Registration',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2BFFF8;">PromoterLink Registration</h2>
                    <p>Your One-Time Password (OTP) for registration is:</p>
                    <h3 style="background: #59FFA7; display: inline-block; padding: 10px 20px; border-radius: 5px;">
                        ${otp}
                    </h3>
                    <p>This OTP is valid for 15 minutes. Please do not share it with anyone.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <hr>
                    <p>Best regards,<br>The PromoterLink Team</p>
                </div>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);

        // TODO: Send OTP to the user via email/SMS (not implemented here)

        res.json({ success: true, message: "OTP sent successfully!", otp }); // Sending OTP for testing (remove in production)
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get OTP details
const getOtpDetails = async (req, res) => {
    const { userId } = req.query; // Use req.query instead of req.body

    try {
        const otpData = await Otp.findOne({ userId });

        if (!otpData) {
            return res.status(404).json({ success: false, message: "No OTP found" });
        }

        res.json({ success: true, otpDetails: otpData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



// Verify OTP and delete it after successful verification
const verifyOtp = async (req, res) => {
    const { userId, otp } = req.body;

    try {
        const otpData = await Otp.findOne({ userId });

        if (!otpData) {
            return res.status(404).json({ success: false, message: "OTP not found or expired" });
        }

        if (otpData.otp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        // OTP is correct, delete it from the database
        await Otp.deleteOne({ userId });

        res.json({ success: true, message: "OTP verified successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const getPendingOtps = async (req, res) => {
  try {
      // Fetch OTPs that are not verified
      const pendingOtps = await Otp.find({ status: { $ne: "verified" } }).populate("userId");

      if (pendingOtps.length === 0) {
          return res.status(404).json({ success: false, message: "No pending OTPs found" });
      }

      res.json({ success: true, pendingOtps });
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
  }
};




// Function to update OTP status and send an email
const updateOtpStatus = async (req, res) => {
  const { userId } = req.body;

  try {
      // Find the OTP record
      const otpData = await Otp.findOne({ userId });

      if (!otpData) {
          return res.status(404).json({ success: false, message: "OTP not found or expired" });
      }

      // Find the user
      const user = await PageOwner.findById(userId);
      if (!user) {
          return res.status(404).json({ success: false, message: "User not found" });
      }

      // If already sent, send email
      if (otpData.status === "sent") {
          const mailOptions = {
              from: `"InfluencerLink Support" <${process.env.EMAIL_USER}>`,
              to: user.email,
              subject: "Your OTP Code",
              text: ` 

Your OTP was also sent to your provided Instagram account via direct message from the username "influencerlink2.0".  

Please log in to https://www.lnfluencerlink.com and verify your Instagram account by entering the OTP.`,
          };

          await transporter.sendMail(mailOptions);

          return res.json({ success: true, message: "OTP email sent successfully!" });
      }

      // Update status from "stored" to "sent"
      otpData.status = "sent";
      await otpData.save();

      // Send OTP email
      const mailOptions = {
          from: `"InfluencerLink Support" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "Your OTP Code",
          text: ` 

Your OTP was also sent to your provided Instagram account via direct message from the username "influencerlink2.0".  

Please log in to https://www.lnfluencerlink.com and verify your Instagram account by entering the OTP.`,
      };

      await transporter.sendMail(mailOptions);

      res.json({ success: true, message: "OTP status updated and email sent!" });

  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
  }
};




module.exports = { sendOtp,updateOtpStatus,sendOtpforFP, getOtpDetails, verifyOtp,getPendingOtps };
