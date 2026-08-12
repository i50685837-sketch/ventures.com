const express = require("express");
const jwt = require("jsonwebtoken");

const Survey = require("../models/Survey");
const Earnings = require("../models/Earnings");
const User = require("../models/User");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;


/* =========================================
   AUTH MIDDLEWARE
========================================= */

async function protect(req, res, next) {

    try {

        const header = req.headers.authorization;

        if (!header || !header.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const token = header.split(" ")[1];

        const decoded = jwt.verify(
            token,
            JWT_SECRET
        );

        const user = await User.findById(
            decoded.id
        );

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "Invalid session"
            });
        }

        req.user = user;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });

    }
}


/* =========================================
   GET AVAILABLE SURVEYS
========================================= */

router.get("/", protect, async (req, res) => {

    try {

        const surveys = await Survey.find({
            active: true
        })
        .select(
            "title category description reward duration questions requiresUpgrade"
        )
        .lean();


        /*
         * Don't send the correct answers
         * to the browser.
         */

        const safeSurveys = surveys.map(
            survey => ({

                id: survey._id,

                title: survey.title,

                category: survey.category,

                description:
                    survey.description,

                reward:
                    survey.reward,

                duration:
                    survey.duration,

                requiresUpgrade:
                    survey.requiresUpgrade,

                questionCount:
                    survey.questions?.length || 0

            })
        );


        res.json({

            success: true,

            surveys: safeSurveys

        });

    } catch (error) {

        console.error(
            "Get surveys error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to load surveys"
        });

    }

});


/* =========================================
   GET ONE SURVEY
========================================= */

router.get("/:id", protect, async (req, res) => {

    try {

        const survey =
            await Survey.findOne({
                _id: req.params.id,
                active: true
            }).lean();


        if (!survey) {

            return res.status(404).json({
                success: false,
                message: "Survey not found"
            });

        }


        /*
         * Never send answers to the client.
         */

        const questions =
            survey.questions.map(
                question => ({

                    id: question._id,

                    question:
                        question.question,

                    options:
                        question.options

                })
            );


        res.json({

            success: true,

            survey: {

                id: survey._id,

                title:
                    survey.title,

                category:
                    survey.category,

                description:
                    survey.description,

                reward:
                    survey.reward,

                duration:
                    survey.duration,

                questions

            }

        });

    } catch (error) {

        console.error(
            "Get survey error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to load survey"
        });

    }

});


/* =========================================
   SUBMIT SURVEY
========================================= */

router.post("/:id/submit", protect, async (req, res) => {

    try {

        const {
            answers
        } = req.body;


        if (!Array.isArray(answers)) {

            return res.status(400).json({
                success: false,
                message: "Invalid answers"
            });

        }


        const survey =
            await Survey.findOne({
                _id: req.params.id,
                active: true
            });


        if (!survey) {

            return res.status(404).json({
                success: false,
                message: "Survey not found"
            });

        }


        /*
         * Check whether the user has already
         * completed this survey.
         *
         * This implementation uses Earnings.reference.
         */

        const alreadyCompleted =
            await Earnings.findOne({

                user: req.user._id,

                type: "survey",

                reference:
                    survey._id.toString()

            });


        if (alreadyCompleted) {

            return res.status(409).json({
                success: false,
                message:
                    "You have already completed this survey"
            });

        }


        /*
         * Validate answer count.
         */

        if (
            answers.length !==
            survey.questions.length
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Please answer all questions"
            });

        }


        /*
         * Check answers server-side.
         */

        let correct = 0;

        survey.questions.forEach(
            (question, index) => {

                const submitted =
                    String(
                        answers[index] ?? ""
                    ).trim();

                const correctAnswer =
                    String(
                        question.answer ?? ""
                    ).trim();

                if (
                    submitted.toLowerCase() ===
                    correctAnswer.toLowerCase()
                ) {

                    correct++;

                }

            }
        );


        /*
         * Require all questions to be
         * answered correctly before rewarding.
         */

        if (
            correct !==
            survey.questions.length
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Survey not passed",

                correct,

                total:
                    survey.questions.length

            });

        }


        const reward =
            Number(survey.reward);


        if (
            !Number.isFinite(reward) ||
            reward <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid survey reward"
            });

        }


        /*
         * Update balance and create earning
         * together.
         */

        req.user.balance += reward;

        req.user.earnings += reward;

        req.user.surveysCompleted += 1;

        await req.user.save();


        await Earnings.create({

            user:
                req.user._id,

            type:
                "survey",

            amount:
                reward,

            description:
                `Completed survey: ${survey.title}`,

            reference:
                survey._id.toString()

        });


        res.json({

            success: true,

            message:
                "Survey completed successfully",

            reward,

            balance:
                req.user.balance,

            surveysCompleted:
                req.user.surveysCompleted

        });

    } catch (error) {

        console.error(
            "Submit survey error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to submit survey"
        });

    }

});


module.exports = router;
