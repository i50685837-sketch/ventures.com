const axios = require("axios");

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
// TIMESTAMP
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
// NORMALIZE PHONE
// =========================================

function normalizePhone(phone) {

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

    return phone;
}


// =========================================
// STK PUSH
// =========================================

exports.stkPush = async (req, res) => {

    try {

        let {
            phone,
            amount,
            accountReference,
            transactionDesc
        } = req.body;


        // -----------------------------
        // VALIDATE
        // -----------------------------

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


        // -----------------------------
        // PHONE
        // -----------------------------

        phone = normalizePhone(phone);


        if (!/^254\d{9}$/.test(phone)) {

            return res.status(400).json({
                success: false,
                message: "Invalid Kenyan phone number"
            });

        }


        // -----------------------------
        // TOKEN
        // -----------------------------

        const accessToken =
            await getAccessToken();


        // -----------------------------
        // TIMESTAMP
        // -----------------------------

        const timestamp =
            createTimestamp();


        // -----------------------------
        // PASSWORD
        // -----------------------------

        const password = Buffer.from(
            `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
        ).toString("base64");


        // -----------------------------
        // DARАJA REQUEST
        // -----------------------------

        const response = await axios.post(

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


        // -----------------------------
        // RESPONSE
        // -----------------------------

        return res.json({

            success: true,

            message:
                "STK Push sent successfully",

            data:
                response.data

        });


    } catch (error) {

        console.error(
            "❌ STK Push Error:",
            error.response?.data ||
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to initiate M-PESA payment",

            error:
                process.env.NODE_ENV === "production"
                    ? undefined
                    : error.response?.data ||
                      error.message

        });

    }

};


// =========================================
// M-PESA CALLBACK
// =========================================

exports.callback = async (req, res) => {

    try {

        console.log(
            "📥 M-PESA CALLBACK"
        );

        console.log(
            JSON.stringify(
                req.body,
                null,
                2
            )
        );


        const callback =
            req.body?.Body?.stkCallback;


        if (!callback) {

            return res.json({
                ResultCode: 0,
                ResultDesc: "Accepted"
            });

        }


        const {
            ResultCode,
            ResultDesc,
            CheckoutRequestID,
            MerchantRequestID
        } = callback;


        if (ResultCode === 0) {

            console.log(
                "✅ PAYMENT SUCCESS"
            );

            console.log(
                "Checkout:",
                CheckoutRequestID
            );

            console.log(
                "Merchant:",
                MerchantRequestID
            );


            /*
             * IMPORTANT:
             *
             * Here you should:
             *
             * 1. Find the pending transaction
             * 2. Verify CheckoutRequestID
             * 3. Verify amount
             * 4. Verify phone
             * 5. Save M-PESA receipt
             * 6. Mark transaction SUCCESS
             * 7. Credit wallet
             */

        } else {

            console.log(
                "❌ PAYMENT FAILED:",
                ResultDesc
            );

        }


        return res.json({

            ResultCode: 0,

            ResultDesc:
                "Callback received successfully"

        });


    } catch (error) {

        console.error(
            "❌ Callback Error:",
            error.message
        );


        return res.json({

            ResultCode: 0,

            ResultDesc:
                "Callback received"

        });

    }

};
