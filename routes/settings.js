const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

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
   GET SETTINGS / PROFILE
========================================= */

router.get("/", protect, async (req, res) => {

    res.json({

        success: true,

        user: {

            id:
                req.user._id,

            name:
                req.user.name,

            email:
                req.user.email,

            referralCode:
                req.user.referralCode,

            isVerified:
                req.user.isVerified

        }

    });

});


/* =========================================
   UPDATE NAME
========================================= */

router.patch("/profile", protect, async (req, res) => {

    try {

        const {
            name
        } = req.body;


        if (!name || !name.trim()) {

            return res.status(400).json({

                success: false,

                message:
                    "Name is required"

            });

        }


        req.user.name =
            name.trim();

        await req.user.save();


        res.json({

            success: true,

            message:
                "Profile updated",

            user: {

                id:
                    req.user._id,

                name:
                    req.user.name,

                email:
                    req.user.email

            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Unable to update profile"

        });

    }

});


/* =========================================
   CHANGE PASSWORD
========================================= */

router.patch(
    "/password",
    protect,
    async (req, res) => {

        try {

            const {
                currentPassword,
                newPassword
            } = req.body;


            if (
                !currentPassword ||
                !newPassword
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Current and new passwords are required"

                });

            }


            if (
                newPassword.length < 6
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "New password must contain at least 6 characters"

                });

            }


            const valid =
                await bcrypt.compare(
                    currentPassword,
                    req.user.password
                );


            if (!valid) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Current password is incorrect"

                });

            }


            req.user.password =
                await bcrypt.hash(
                    newPassword,
                    12
                );

            await req.user.save();


            res.json({

                success: true,

                message:
                    "Password changed successfully"

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Unable to change password"

            });

        }

    }
);


/* =========================================
   ACCOUNT STATUS
========================================= */

router.get("/account", protect, async (req, res) => {

    res.json({

        success: true,

        account: {

            active:
                req.user.isActive,

            verified:
                req.user.isVerified,

            createdAt:
                req.user.createdAt

        }

    });

});


module.exports = router;
