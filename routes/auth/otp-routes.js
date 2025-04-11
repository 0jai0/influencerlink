const express = require("express");
const { sendOtp,getPendingOtps,sendOtpforFP,getOtpDetails, verifyOtp,updateOtpStatus     } = require("../../controllers/auth/otp-controller");

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/send-otpFP", sendOtpforFP);
router.get("/userId", getOtpDetails);
router.post("/verify-otp", verifyOtp);
router.get("/pending-otps", getPendingOtps);
router.post("/update-otp-status", updateOtpStatus);

module.exports = router;
