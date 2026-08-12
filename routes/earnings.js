const express = require("express");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Earnings = require("../models/Earnings");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;


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
   GET EARNINGS SUMMARY
========================================= */

router.get("/", protect, async (req, res) => {

    try {

        const earnings =
            await Earnings.find({
                user: req.user._id
            })
            .sort({
                createdAt: -1
            })
            .limit(100)
            .lean();


        let surveyTotal = 0;
        let bonusTotal = 0;
        let referralTotal = 0;


        earnings.forEach(item => {

            const amount =
                Number(item.amount || 0);

            if (item.type === "survey") {
                surveyTotal += amount;
            }

            if (item.type === "bonus") {
                bonusTotal += amount;
            }

            if (item.type === "referral") {
                referralTotal += amount;
            }

        });


        const total =
            surveyTotal +
            bonusTotal +
            referralTotal;


        const history =
            earnings.map(item => ({

                id: item._id,

                type: item.type,

                amount:
                    Number(item.amount || 0),

                description:
                    item.description || "",

                reference:
                    item.reference || null,

                createdAt:
                    item.createdAt

            }));


        res.json({

            success: true,

            summary: {

                total:
                    Number(total.toFixed(2)),

                survey:
                    Number(surveyTotal.toFixed(2)),

                bonus:
                    Number(bonusTotal.toFixed(2)),

                referral:
                    Number(referralTotal.toFixed(2)),

                balance:
                    Number(
                        req.user.balance || 0
                    )

            },

            history

        });

    } catch (error) {

        console.error(
            "Earnings error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to load earnings"

        });

    }

});


/* =========================================
   EARNINGS BY TYPE
========================================= */

router.get("/type/:type", protect, async (req, res) => {

    try {

        const allowedTypes = [
            "survey",
            "bonus",
            "referral"
        ];


        const type =
            req.params.type.toLowerCase();


        if (!allowedTypes.includes(type)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid earnings type"

            });

        }


        const earnings =
            await Earnings.find({

                user: req.user._id,

                type

            })
            .sort({
                createdAt: -1
            })
            .limit(100)
            .lean();


        const total =
            earnings.reduce(
                (sum, item) =>
                    sum +
                    Number(item.amount || 0),
                0
            );


        res.json({

            success: true,

            type,

            total:
                Number(total.toFixed(2)),

            earnings:
                earnings.map(item => ({

                    id: item._id,

                    amount:
                        Number(
                            item.amount || 0
                        ),

                    description:
                        item.description || "",

                    reference:
                        item.reference || null,

                    createdAt:
                        item.createdAt

                }))

        });

    } catch (error) {

        console.error(
            "Earnings type error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to load earnings"

        });

    }

});


/* =========================================
   RECENT EARNINGS
========================================= */

router.get("/recent/list", protect, async (req, res) => {

    try {

        const earnings =
            await Earnings.find({
                user: req.user._id
            })
            .sort({
                createdAt: -1
            })
            .limit(10)
            .lean();


        res.json({

            success: true,

            earnings

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Unable to load recent earnings"

        });

    }

});


module.exports = router;
