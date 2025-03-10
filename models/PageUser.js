const mongoose = require('mongoose');

const pageOwnerSchema = new mongoose.Schema({
    ownerName: { type: String, required: true },
    profilePicUrl:{type: String},
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    mobile: { type: String, required: true },
    whatsapp: { type: String },
    socialMediaPlatforms: {
        type: [String],
        enum: ['Instagram', 'Facebook', 'Twitter', 'YouTube', 'WhatsApp'],
        
    },
    profileDetails: [{
        platform: { 
            type: String, 
            enum: ['Instagram', 'Facebook', 'Twitter', 'YouTube', 'WhatsApp'], 
            
        },
        profileName: { type: String },
        profilePicUrl: { type: String },
        followers: { type: Number },
        verified: { type: Boolean, default: false }  // Verification status
    }],
    adCategories: [{ type: String }], // Categories they can post ads for
    pageContentCategory: [{ type: String }], // Niche of page (e.g., Tech, Fashion, Food)
    pricing: {
        storyPost: { type: Number },  // Cost for a story post
        feedPost: { type: Number },
        reel: { type: Number }
    },
    pastPosts: [{
        category: { type: String},  // Category of the post
        postLink: { type: String },  // URL of the post
        platform: { 
            type: String, 
            enum: ['Instagram', 'Facebook', 'Twitter', 'YouTube', 'WhatsApp'] 
        }  // Platform where the post was made
    }],
    isOnline: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const PageOwner = mongoose.model('PageOwner', pageOwnerSchema);
module.exports = PageOwner;
