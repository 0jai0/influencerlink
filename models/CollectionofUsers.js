// models/CollectionofUser.js
const mongoose = require("mongoose");
const PageOwner = require("./PageUser"); // Import the User model

const collectionOfUserSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: "PageOwner" },
  collectionOfUserId: [{ type: mongoose.Schema.Types.ObjectId, ref: "PageOwner" }],
  
});

const CollectionofUser = mongoose.model("CollectionofUser", collectionOfUserSchema);

module.exports = CollectionofUser;