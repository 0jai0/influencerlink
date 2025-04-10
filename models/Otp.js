const mongoose = require("mongoose");
const PageOwner = require("./PageUser");

const otpSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    otp: { type: String, required: true },
    status: { type: String, enum: ["stored", "sent", "verified"], default: "stored" },
    createdAt: { type: Date, default: Date.now,expires: 900} // Auto-delete after 5 minutes
});

otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

const Otp = mongoose.model("Otp", otpSchema);
module.exports = Otp;
