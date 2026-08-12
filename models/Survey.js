const mongoose = require("mongoose");

const surveySchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: ""
        },

        reward: {
            type: Number,
            required: true,
            min: 0
        },

        duration: {
            type: Number,
            default: 60
        },

        questions: [
            {
                question: {
                    type: String,
                    required: true
                },

                options: [
                    {
                        type: String
                    }
                ],

                answer: {
                    type: String
                }
            }
        ],

        active: {
            type: Boolean,
            default: true
        },

        requiresUpgrade: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Survey",
    surveySchema
);
