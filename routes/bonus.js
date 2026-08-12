const express = require("express");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Bonus = require("../models/Bonus");
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

        const user = await User.findById(decoded.id);

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
   GET USER BONUSES
========================================= */

router.get("/", protect, async (req, res) => {

    try {

        const bonuses = await Bonus.find({
            user: req.user._id
        })
        .sort({
            createdAt: -1
        })
        .limit(100)
        .lean();


        const total = bonuses.reduce(
            (sum, bonus) =>
                sum + Number(bonus.amount || 0),
            0
        );


        res.json({

            success: true,

            balance:
                Number(
                    req.user.bonusBalance || 0
                ),

            totalEarned:
                Number(total.toFixed(2)),

            bonuses: bonuses.map(bonus => ({

                id: bonus._id,

                type: bonus.type,

                amount:
                    Number(bonus.amount || 0),

                description:
                    bonus.description || "",

                status:
                    bonus.status,

                createdAt:
                    bonus.createdAt

            }))

        });

    } catch (error) {

        console.error(
            "Bonus loading error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to load bonuses"

        });

    }

});


/* =========================================
   DAILY BONUS
========================================= */

router.post("/daily", protect, async (req, res) => {

    try {

        const now = new Date();

        const lastBonus =
            req.user.lastDailyBonus;


        /*
         * Only one daily bonus per day.
         */

        if (lastBonus) {

            const lastDate =
                new Date(lastBonus);

            const sameDay =
                lastDate.getUTCFullYear() ===
                    now.getUTCFullYear() &&

                lastDate.getUTCMonth() ===
                    now.getUTCMonth() &&

                lastDate.getUTCDate() ===
                    now.getUTCDate();


            if (sameDay) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Daily bonus already claimed",

                    nextBonus:
                        "Come back tomorrow"

                });

            }

        }


        const amount =
            Number(
                process.env.DAILY_BONUS || 150
            );


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            return res.status(500).json({

                success: false,

                message:
                    "Daily bonus is not configured"

            });

        }


        /*
         * Credit both the bonus balance
         * and the main earning balance.
         */

        req.user.balance += amount;

        req.user.earnings += amount;

        req.user.bonusBalance += amount;

        req.user.lastDailyBonus = now;

        await req.user.save();


        const bonus =
            await Bonus.create({

                user:
                    req.user._id,

                type:
                    "daily",

                amount,

                description:
                    "Daily Ventures bonus",

                status:
                    "credited"

            });


        await Earnings.create({

            user:
                req.user._id,

            type:
                "bonus",

            amount,

            description:
                "Daily bonus",

            reference:
                bonus._id.toString()

        });


        res.json({

            success: true,

            message:
                "Daily bonus credited",

            amount,

            balance:
                req.user.balance,

            bonusBalance:
                req.user.bonusBalance

        });

    } catch (error) {

        console.error(
            "Daily bonus error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to claim daily bonus"

        });

    }

});


/* =========================================
   BONUS STATUS
========================================= */

router.get("/status", protect, async (req, res) => {

    try {

        const now = new Date();

        let available = true;


        if (req.user.lastDailyBonus) {

            const last =
                new Date(
                    req.user.lastDailyBonus
                );


            const sameDay =
                last.getUTCFullYear() ===
                    now.getUTCFullYear() &&

                last.getUTCMonth() ===
                    now.getUTCMonth() &&

                last.getUTCDate() ===
                    now.getUTCDate();


            if (sameDay) {
                available = false;
            }

        }


        res.json({

            success: true,

            available,

            bonus:
                Number(
                    process.env.DAILY_BONUS || 150
                ),

            message: available
                ? "Your daily bonus is available"
                : "Come back tomorrow"

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message:
                "Unable to check bonus status"

        });

    }

});


module.exports = router;
