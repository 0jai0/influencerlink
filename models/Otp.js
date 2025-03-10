const mongoose = require("mongoose");
const PageOwner = require("./PageUser");

const otpSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "PageOwner", required: true },
    otp: { type: String, required: true },
    status: { type: String, enum: ["stored", "sent", "verified"], default: "stored" },
    createdAt: { type: Date, default: Date.now} // Auto-delete after 5 minutes
});

const Otp = mongoose.model("Otp", otpSchema);
module.exports = Otp;
