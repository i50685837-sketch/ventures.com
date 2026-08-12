const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from .env");
}


/* =========================================
   JWT
========================================= */

function createToken(user) {

    return jwt.sign(
        {
            id: user._id.toString(),
            role: user.role
        },
        JWT_SECRET,
        {
            expiresIn:
                process.env.JWT_EXPIRES_IN || "7d"
        }
    );
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
            await User.findById(decoded.id)
                .select("-password");

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "Invalid user session"
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
   REGISTER
========================================= */

router.post("/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password,
            referralCode
        } = req.body;


        if (!name || !email || !password) {

            return res.status(400).json({
                success: false,
                message:
                    "Name, email and password are required"
            });

        }


        if (password.length < 6) {

            return res.status(400).json({
                success: false,
                message:
                    "Password must contain at least 6 characters"
            });

        }


        const normalizedEmail =
            email.trim().toLowerCase();


        const existing =
            await User.findOne({
                email: normalizedEmail
            });


        if (existing) {

            return res.status(409).json({
                success: false,
                message:
                    "An account with this email already exists"
            });

        }


        let referredBy = null;


        if (referralCode) {

            const referrer =
                await User.findOne({
                    referralCode:
                        referralCode.trim()
                });

            if (referrer) {
                referredBy = referrer._id;
            }
        }


        const hashedPassword =
            await bcrypt.hash(password, 12);


        const newReferralCode =
            crypto.randomBytes(5)
                .toString("hex")
                .toUpperCase();


        const user =
            await User.create({

                name: name.trim(),

                email: normalizedEmail,

                password: hashedPassword,

                referralCode:
                    newReferralCode,

                referredBy

            });


        const token =
            createToken(user);


        res.status(201).json({

            success: true,

            message:
                "Account created successfully",

            token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                referralCode:
                    user.referralCode
            }

        });

    } catch (error) {

        console.error(
            "Register error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Registration failed"
        });

    }

});


/* =========================================
   LOGIN
========================================= */

router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message:
                    "Email and password are required"
            });

        }


        const user =
            await User.findOne({
                email:
                    email.trim().toLowerCase()
            });


        if (!user) {

            return res.status(401).json({
                success: false,
                message:
                    "Invalid email or password"
            });

        }


        const validPassword =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!validPassword) {

            return res.status(401).json({
                success: false,
                message:
                    "Invalid email or password"
            });

        }


        if (!user.isActive) {

            return res.status(403).json({
                success: false,
                message:
                    "Your account is disabled"
            });

        }


        const token =
            createToken(user);


        res.json({

            success: true,

            message: "Login successful",

            token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                referralCode:
                    user.referralCode,
                balance:
                    user.balance,
                earnings:
                    user.earnings,
                bonusBalance:
                    user.bonusBalance
            }

        });

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Login failed"
        });

    }

});


/* =========================================
   CURRENT USER
========================================= */

router.get("/me", protect, async (req, res) => {

    res.json({
        success: true,
        user: req.user
    });

});


/* =========================================
   LOGOUT
========================================= */

router.post("/logout", protect, async (req, res) => {

    /*
     * JWTs are stateless.
     *
     * The browser removes the token during logout.
     * For stronger security, a production system
     * can additionally implement token revocation.
     */

    res.json({
        success: true,
        message: "Logged out successfully"
    });

});


module.exports = router;
