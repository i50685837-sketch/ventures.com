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
            jwt.verify(
                token,
                JWT_SECRET
            );

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
   GET WALLET
========================================= */

router.get("/", protect, async (req, res) => {

    try {

        const transactions =
            await Earnings.find({
                user: req.user._id
            })
            .sort({
                createdAt: -1
            })
            .limit(50)
            .lean();


        const transactionList =
            transactions.map(item => ({

                id: item._id,

                type: item.type,

                amount: item.amount,

                description:
                    item.description,

                reference:
                    item.reference,

                createdAt:
                    item.createdAt

            }));


        res.json({

            success: true,

            wallet: {

                balance:
                    Number(
                        req.user.balance || 0
                    ),

                earnings:
                    Number(
                        req.user.earnings || 0
                    ),

                bonusBalance:
                    Number(
                        req.user.bonusBalance || 0
                    ),

                totalWithdrawn:
                    Number(
                        req.user.totalWithdrawn || 0
                    )

            },

            transactions:
                transactionList

        });

    } catch (error) {

        console.error(
            "Wallet error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to load wallet"
        });

    }

});


/* =========================================
   GET BALANCE ONLY
========================================= */

router.get("/balance", protect, async (req, res) => {

    res.json({

        success: true,

        balance:
            Number(
                req.user.balance || 0
            ),

        earnings:
            Number(
                req.user.earnings || 0
            ),

        bonusBalance:
            Number(
                req.user.bonusBalance || 0
            )

    });

});


/* =========================================
   DEPOSIT REQUEST
========================================= */

router.post("/deposit", protect, async (req, res) => {

    const {
        amount
    } = req.body;


    const value =
        Number(amount);


    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Enter a valid deposit amount"

        });

    }


    /*
     * Do NOT increase the user's balance here.
     *
     * A real payment provider must confirm
     * the payment on the backend first.
     */

    return res.status(501).json({

        success: false,

        message:
            "Payment processing is not configured yet"

    });

});


/* =========================================
   WITHDRAW REQUEST
========================================= */

router.post("/withdraw", protect, async (req, res) => {

    const {
        amount,
        phone
    } = req.body;


    const value =
        Number(amount);


    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Enter a valid withdrawal amount"

        });

    }


    if (!phone) {

        return res.status(400).json({

            success: false,

            message:
                "Phone number is required"

        });

    }


    if (
        value >
        Number(req.user.balance || 0)
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Insufficient balance"

        });

    }


    /*
     * Don't deduct money until a proper
     * withdrawal/payment system exists.
     */

    return res.status(501).json({

        success: false,

        message:
            "Withdrawal processing is not configured yet"

    });

});


module.exports = router;
