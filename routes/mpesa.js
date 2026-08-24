const express = require("express");
const axios = require("axios");

const router = express.Router();

const ENV = process.env.MPESA_ENV || "sandbox";

const BASE_URL =
    ENV === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";


// =========================================
// GET ACCESS TOKEN
// =========================================

async function getAccessToken() {

    const credentials = Buffer.from(
        `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64");

    const response = await axios.get(
        `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
        {
            headers: {
                Authorization: `Basic ${credentials}`
            }
        }
    );

    return response.data.access_token;
}


// =========================================
// CREATE STK PASSWORD
// =========================================

function createTimestamp() {

    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}


// =========================================
// POST /api/mpesa/stkpush
// =========================================

router.post("/stkpush", async (req, res) => {

    try {

        let { phone, amount, accountReference, transactionDesc } = req.body;


        // -------------------------------
        // VALIDATION
        // -------------------------------

        if (!phone || !amount) {

            return res.status(400).json({
                success: false,
                message: "Phone number and amount are required"
            });

        }


        amount = Number(amount);

        if (!Number.isInteger(amount) || amount < 1) {

            return res.status(400).json({
                success: false,
                message: "Amount must be a valid whole number"
            });

        }


        // -------------------------------
        // NORMALIZE PHONE
        // -------------------------------

        phone = String(phone).replace(/\s+/g, "");

        if (phone.startsWith("+254")) {
            phone = phone.substring(1);
        }

        if (phone.startsWith("07")) {
            phone = "254" + phone.substring(1);
        }

        if (phone.startsWith("01")) {
            phone = "254" + phone.substring(1);
        }


        if (!/^254\d{9}$/.test(phone)) {

            return res.status(400).json({
                success: false,
                message: "Invalid Kenyan phone number"
            });

        }


        // -------------------------------
        // ACCESS TOKEN
        // -------------------------------

        const accessToken = await getAccessToken();


        // -------------------------------
        // TIMESTAMP
        // -------------------------------

        const timestamp = createTimestamp();


        // -------------------------------
        // PASSWORD
        // -------------------------------

        const password = Buffer.from(
            `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
        ).toString("base64");


        // -------------------------------
        // STK REQUEST
        // -------------------------------

        const stkResponse = await axios.post(

            `${BASE_URL}/mpesa/stkpush/v1/processrequest`,

            {
                BusinessShortCode:
                    process.env.MPESA_SHORTCODE,

                Password:
                    password,

                Timestamp:
                    timestamp,

                TransactionType:
                    "CustomerPayBillOnline",

                Amount:
                    amount,

                PartyA:
                    phone,

                PartyB:
                    process.env.MPESA_SHORTCODE,

                PhoneNumber:
                    phone,

                CallBackURL:
                    process.env.MPESA_CALLBACK_URL,

                AccountReference:
                    accountReference || "VENTURES",

                TransactionDesc:
                    transactionDesc || "Ventures Deposit"
            },

            {
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`,

                    "Content-Type":
                        "application/json"
                }
            }

        );


        // -------------------------------
        // RESPONSE
        // -------------------------------

        return res.json({

            success: true,

            message:
                "STK Push initiated successfully",

            data: stkResponse.data

        });


    } catch (error) {

        console.error(
            "❌ M-PESA STK ERROR:",
            error.response?.data ||
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to initiate M-PESA payment",

            error:
                process.env.NODE_ENV === "production"
                    ? undefined
                    : error.response?.data || error.message

        });

    }

});


// =========================================
// M-PESA CALLBACK
// =========================================

router.post("/callback", async (req, res) => {

    try {

        console.log(
            "📥 M-PESA CALLBACK:"
        );

        console.log(
            JSON.stringify(
                req.body,
                null,
                2
            )
        );


        // IMPORTANT:
        // Verify the callback result before
        // crediting a user's wallet.


        const callback =
            req.body?.Body?.stkCallback;


        if (!callback) {

            return res.json({
                ResultCode: 0,
                ResultDesc: "Accepted"
            });

        }


        const resultCode =
            callback.ResultCode;


        const checkoutRequestID =
            callback.CheckoutRequestID;


        if (resultCode === 0) {

            console.log(
                "✅ M-PESA PAYMENT SUCCESS:",
                checkoutRequestID
            );


            // TODO:
            // Find the pending transaction
            // using CheckoutRequestID.
            //
            // Then verify the amount,
            // phone number and transaction ID
            // before crediting the wallet.

        } else {

            console.log(
                "❌ M-PESA PAYMENT FAILED:",
                callback.ResultDesc
            );

        }


        return res.json({

            ResultCode: 0,

            ResultDesc:
                "Callback received successfully"

        });


    } catch (error) {

        console.error(
            "❌ Callback error:",
            error.message
        );

        return res.json({

            ResultCode: 0,

            ResultDesc:
                "Callback received"

        });

    }

});


module.exports = router;
