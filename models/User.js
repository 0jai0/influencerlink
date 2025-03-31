const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    whatsapp: { type: String },
    password: { type: String, required: true },
    companyName: { type: String },
    industry: { type: String },  // Business Type
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
