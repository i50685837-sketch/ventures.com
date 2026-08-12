const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
    {
        referrer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        referredUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        reward: {
            type: Number,
            default: 0,
            min: 0
        },

        status: {
            type: String,
            enum: [
                "pending",
                "active",
                "rewarded"
            ],
            default: "pending"
        },

        rewardedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Referral",
    referralSchema
);
