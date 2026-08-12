const express = require("express");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Referral = require("../models/Referral");
const Earnings = require("../models/Earnings");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from .env");
}


/* =========================================
   AUTH MIDDLEWARE
========================================= */

async function protect(req, res, next) {

    try {

        const header =
            req.headers.authorization;

        if (
            !header ||
            !header.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const token =
            header.split(" ")[1];

        const decoded =
            jwt.verify(token, JWT_SECRET);

        const user =
            await User.findById(decoded.id);

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
   GET REFERRALS
========================================= */

router.get("/", protect, async (req, res) => {

    try {

        const referrals =
            await Referral.find({
                referrer: req.user._id
            })
            .populate(
                "referredUser",
                "name email createdAt"
            )
            .sort({
                createdAt: -1
            })
            .lean();


        const totalReferrals =
            referrals.length;


        const activeReferrals =
            referrals.filter(
                item =>
                    item.status === "active" ||
                    item.status === "rewarded"
            ).length;


        const referralEarnings =
            referrals.reduce(
                (total, item) =>
                    total +
                    Number(item.reward || 0),
                0
            );


        const list =
            referrals.map(item => ({

                id: item._id,

                name:
                    item.referredUser?.name ||
                    "Ventures Member",

                email:
                    item.referredUser?.email ||
                    "",

                status:
                    item.status,

                reward:
                    Number(item.reward || 0),

                createdAt:
                    item.createdAt,

                rewardedAt:
                    item.rewardedAt

            }));


        res.json({

            success: true,

            referralCode:
                req.user.referralCode,

            totalReferrals,

            activeReferrals,

            referralEarnings:
                Number(
                    referralEarnings.toFixed(2)
                ),

            referrals: list

        });

    } catch (error) {

        console.error(
            "Referral error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to load referrals"

        });

    }

});


/* =========================================
   GET REFERRAL CODE
========================================= */

router.get("/code", protect, async (req, res) => {

    res.json({

        success: true,

        referralCode:
            req.user.referralCode

    });

});


/* =========================================
   CREATE / REPAIR REFERRAL CODE
========================================= */

router.post("/generate", protect, async (req, res) => {

    try {

        if (req.user.referralCode) {

            return res.json({

                success: true,

                referralCode:
                    req.user.referralCode

            });

        }


        const randomCode =
            "VENT" +
            Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();


        const existing =
            await User.findOne({
                referralCode: randomCode
            });


        if (existing) {

            return res.status(409).json({

                success: false,

                message:
                    "Unable to generate code. Try again."

            });

        }


        req.user.referralCode =
            randomCode;

        await req.user.save();


        res.json({

            success: true,

            referralCode:
                randomCode

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Unable to generate referral code"

        });

    }

});


/* =========================================
   REFERRAL SUMMARY
========================================= */

router.get("/summary", protect, async (req, res) => {

    try {

        const referrals =
            await Referral.find({
                referrer: req.user._id
            }).lean();


        const total =
            referrals.length;


        const active =
            referrals.filter(
                item =>
                    item.status === "active" ||
                    item.status === "rewarded"
            ).length;


        const rewarded =
            referrals.filter(
                item =>
                    item.status === "rewarded"
            ).length;


        const pending =
            referrals.filter(
                item =>
                    item.status === "pending"
            ).length;


        const earnings =
            referrals.reduce(
                (sum, item) =>
                    sum +
                    Number(item.reward || 0),
                0
            );


        res.json({

            success: true,

            summary: {

                total,

                active,

                rewarded,

                pending,

                earnings:
                    Number(
                        earnings.toFixed(2)
                    )

            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Unable to load referral summary"

        });

    }

});


/* =========================================
   INTERNAL REWARD FUNCTION
========================================= */

/*
 * This function should be called by trusted
 * backend logic after a referral becomes
 * eligible.
 *
 * It is deliberately NOT exposed as a public
 * HTTP endpoint.
 */

async function rewardReferral(
    referralId
) {

    const referral =
        await Referral.findById(
            referralId
        );


    if (!referral) {

        throw new Error(
            "Referral not found"
        );

    }


    if (
        referral.status === "rewarded"
    ) {

        return false;

    }


    const reward =
        Number(
            process.env.REFERRAL_BONUS || 150
        );


    if (
        !Number.isFinite(reward) ||
        reward <= 0
    ) {

        throw new Error(
            "Invalid referral reward"
        );

    }


    const referrer =
        await User.findById(
            referral.referrer
        );


    if (!referrer) {

        throw new Error(
            "Referrer not found"
        );

    }


    /*
     * Credit the referrer.
     */

    referrer.balance += reward;

    referrer.earnings += reward;

    await referrer.save();


    /*
     * Record the earning.
     */

    await Earnings.create({

        user:
            referrer._id,

        type:
            "referral",

        amount:
            reward,

        description:
            "Referral reward",

        reference:
            referral._id.toString()

    });


    referral.reward =
        reward;

    referral.status =
        "rewarded";

    referral.rewardedAt =
        new Date();

    await referral.save();


    return true;
}


module.exports = router;

/*
 * Export the helper for trusted backend
 * services if needed.
 */
module.exports.rewardReferral =
    rewardReferral;
