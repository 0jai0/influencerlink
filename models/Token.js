const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  fcmToken: { type: String, required: true },
});

const User = mongoose.model("Token", userSchema);
module.exports = User;
