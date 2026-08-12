const mongoose = require("mongoose");

const connectDB = async () => {
    try {

        const uri = process.env.MONGO_URI;

        if (!uri) {
            throw new Error(
                "MONGO_URI is not defined in .env"
            );
        }

        const connection =
            await mongoose.connect(uri);

        console.log(
            `✅ MongoDB Connected: ${connection.connection.host}`
        );

    } catch (error) {

        console.error(
            "❌ MongoDB Connection Error:",
            error.message
        );

        process.exit(1);
    }
};


/* Handle connection events */

mongoose.connection.on(
    "disconnected",
    () => {
        console.log("⚠️ MongoDB disconnected");
    }
);

mongoose.connection.on(
    "reconnected",
    () => {
        console.log("🔄 MongoDB reconnected");
    }
);


module.exports = connectDB;
