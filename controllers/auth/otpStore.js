const OtpModel = require('../../models/Otp'); // Import the OTP model

module.exports = {
  // Set OTP in MongoDB
  setOtp: async (email, otp) => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes
    try {
      await OtpModel.findOneAndUpdate(
        { email }, // Search by email
        { otp, expiresAt }, // Update OTP and expiration
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      console.error('Error setting OTP:', err);
      throw new Error('Failed to set OTP');
    }
  },

  // Verify OTP in MongoDB
  verifyOtp: async (email, otp) => {
    try {
      const record = await OtpModel.findOne({ email });

      if (!record) return false; // No OTP found
      if (record.expiresAt < new Date()) {
        await OtpModel.deleteOne({ email }); // Delete expired OTP
        return false;
      }

      return record.otp === otp; // Return true if OTP matches
    } catch (err) {
      console.error('Error verifying OTP:', err);
      return false;
    }
  },

  // Delete OTP from MongoDB
  deleteOtp: async (email) => {
    try {
      await OtpModel.deleteOne({ email }); // Delete OTP record
    } catch (err) {
      console.error('Error deleting OTP:', err);
      throw new Error('Failed to delete OTP');
    }
  },
};
