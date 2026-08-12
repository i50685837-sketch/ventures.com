const mongoose = require("mongoose");

const bonusSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        type: {
            type: String,
            enum: [
                "daily",
                "survey",
                "referral",
                "special"
            ],
            required: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        description: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            enum: [
                "pending",
                "credited",
                "cancelled"
            ],
            default: "credited"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Bonus",
    bonusSchema
);
