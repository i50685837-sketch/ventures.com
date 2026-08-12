const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            minlength: 6
        },

        referralCode: {
            type: String,
            unique: true,
            index: true
        },

        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        balance: {
            type: Number,
            default: 0,
            min: 0
        },

        earnings: {
            type: Number,
            default: 0,
            min: 0
        },

        bonusBalance: {
            type: Number,
            default: 0,
            min: 0
        },

        totalWithdrawn: {
            type: Number,
            default: 0,
            min: 0
        },

        surveysCompleted: {
            type: Number,
            default: 0
        },

        isVerified: {
            type: Boolean,
            default: false
        },

        isActive: {
            type: Boolean,
            default: true
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },

        lastDailyBonus: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
