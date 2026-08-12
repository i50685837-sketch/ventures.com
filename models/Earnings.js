const mongoose = require("mongoose");

const earningsSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        type: {
            type: String,
            enum: [
                "survey",
                "bonus",
                "referral"
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

        reference: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Earnings",
    earningsSchema
);
