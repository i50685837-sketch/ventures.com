require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");

const app = express();


/* =========================================
   CONFIG
========================================= */

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {

    console.error(
        "❌ MONGO_URI is missing from .env"
    );

    process.exit(1);
}


/* =========================================
   MIDDLEWARE
========================================= */

app.use(
    cors({
        origin:
            process.env.CLIENT_URL || true,

        credentials: true
    })
);

app.use(
    express.json({
        limit: "1mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "1mb"
    })
);


/* =========================================
   RATE LIMITING
========================================= */

const authLimiter = rateLimit({

    windowMs:
        15 * 60 * 1000,

    max: 50,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
        success: false,
        message:
            "Too many requests. Please try again later."
    }

});


/* =========================================
   STATIC FRONTEND
========================================= */

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


/* =========================================
   API HEALTH CHECK
========================================= */

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Ventures API is running",

            database:
                mongoose.connection.readyState === 1
                    ? "connected"
                    : "disconnected",

            environment:
                process.env.NODE_ENV ||
                "development"

        });

    }
);


/* =========================================
   AUTH ROUTES
========================================= */

try {

    const authRoutes =
        require("./routes/auth");

    app.use(
        "/api/auth",
        authLimiter,
        authRoutes
    );

    console.log(
        "✅ Auth routes loaded"
    );

} catch (error) {

    console.log(
        "⚠️ routes/auth.js not loaded:",
        error.message
    );

}


/* =========================================
   SURVEY ROUTES
========================================= */

try {

    const surveyRoutes =
        require("./routes/surveys");

    app.use(
        "/api/surveys",
        surveyRoutes
    );

    console.log(
        "✅ Survey routes loaded"
    );

} catch (error) {

    console.log(
        "⚠️ routes/surveys.js not loaded:",
        error.message
    );

}


/* =========================================
   WALLET ROUTES
========================================= */

try {

    const walletRoutes =
        require("./routes/wallet");

    app.use(
        "/api/wallet",
        walletRoutes
    );

    console.log(
        "✅ Wallet routes loaded"
    );

} catch (error) {

    console.log(
        "⚠️ routes/wallet.js not loaded:",
        error.message
    );

}


/* =========================================
   EARNINGS ROUTES
========================================= */

try {

    const earningsRoutes =
        require("./routes/earnings");

    app.use(
        "/api/earnings",
        earningsRoutes
    );

    console.log(
        "✅ Earnings routes loaded"
    );

} catch (error) {

    console.log(
        "⚠️ routes/earnings.js not loaded:",
        error.message
    );

}


/* =========================================
   REFERRAL ROUTES
========================================= */

try {

    const referralRoutes =
        require("./routes/referrals");

    app.use(
        "/api/referrals",
        referralRoutes
    );

    console.log(
        "✅ Referral routes loaded"
    );

} catch (error) {

    console.log(
        "⚠️ routes/referrals.js not loaded:",
        error.message
    );

}


/* =========================================
   BONUS ROUTES
========================================= */

try {

    const bonusRoutes =
        require("./routes/bonuses");

    app.use(
        "/api/bonuses",
        bonusRoutes
    );

    console.log(
        "✅ Bonus routes loaded"
    );

} catch (error) {

    console.log(
        "⚠️ routes/bonuses.js not loaded:",
        error.message
    );

}


/* =========================================
   M-PESA DARАJA ROUTES
========================================= */

try {

    const mpesaRoutes =
        require("./routes/mpesa");

    app.use(
        "/api/mpesa",
        mpesaRoutes
    );

    console.log(
        "✅ M-PESA Daraja routes loaded"
    );

} catch (error) {

    console.log(
        "⚠️ routes/mpesa.js not loaded:",
        error.message
    );

}


/* =========================================
   ROOT API
========================================= */

app.get(
    "/api",
    (req, res) => {

        res.json({

            name:
                "Ventures API",

            version:
                "1.0.0",

            status:
                "online",

            services: {

                database:
                    mongoose.connection.readyState === 1
                        ? "connected"
                        : "disconnected",

                mpesa:
                    "available",

                auth:
                    "available",

                surveys:
                    "available",

                wallet:
                    "available"

            }

        });

    }
);


/* =========================================
   FRONTEND
========================================= */

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);


/* =========================================
   API 404
========================================= */

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "API endpoint not found",

            path:
                req.originalUrl

        });

    }
);


/* =========================================
   GENERAL ERROR HANDLER
========================================= */

app.use(
    (error, req, res, next) => {

        console.error(
            "❌ Server Error:",
            error
        );


        if (res.headersSent) {

            return next(error);

        }


        res.status(
            error.status || 500
        ).json({

            success: false,

            message:
                process.env.NODE_ENV ===
                "production"

                    ? "Internal server error"

                    : error.message

        });

    }
);


/* =========================================
   DATABASE + SERVER START
========================================= */

async function startServer() {

    try {

        await mongoose.connect(
            MONGO_URI
        );

        console.log(
            "✅ MongoDB Connected"
        );


        app.listen(
            PORT,
            () => {

                console.log(
                    `🚀 Ventures server running on port ${PORT}`
                );

                console.log(
                    `🌐 Environment: ${
                        process.env.NODE_ENV ||
                        "development"
                    }`
                );

                console.log(
                    `💳 M-PESA: ${
                        process.env.MPESA_ENV ||
                        "sandbox"
                    }`
                );

            }
        );


    } catch (error) {

        console.error(
            "❌ MongoDB connection failed:",
            error.message
        );

        process.exit(1);

    }

}


startServer();


/* =========================================
   GRACEFUL SHUTDOWN
========================================= */

process.on(
    "SIGINT",
    async () => {

        console.log(
            "\n🛑 Shutting down server..."
        );

        await mongoose.connection.close();

        process.exit(0);

    }
);


process.on(
    "SIGTERM",
    async () => {

        console.log(
            "\n🛑 SIGTERM received..."
        );

        await mongoose.connection.close();

        process.exit(0);

    }
);
