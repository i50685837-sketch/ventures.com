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
// GENERATE TIMESTAMP
// =========================================

function generateTimestamp() {

    const now = new Date();

    const year = now.getFullYear();
    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        now.getDate()
    ).padStart(2, "0");

    const hours = String(
        now.getHours()
    ).padStart(2, "0");

    const minutes = String(
        now.getMinutes()
    ).padStart(2, "0");

    const seconds = String(
        now.getSeconds()
    ).padStart(2, "0");

    return (
        year +
        month +
        day +
        hours +
        minutes +
        seconds
    );
}


// =========================================
// NORMALIZE PHONE
// =========================================

function normalizePhone(phone) {

    phone = String(phone)
        .replace(/\s+/g, "");

    if (phone.startsWith("+254")) {
        phone = phone.substring(1);
    }

    if (phone.startsWith("07")) {
        phone =
            "254" +
            phone.substring(1);
    }

    if (phone.startsWith("01")) {
        phone =
            "254" +
            phone.substring(1);
    }

    return phone;
}


// =========================================
// STK PUSH
// =========================================

async function stkPush({
    phone,
    amount,
    accountReference = "VENTURES",
    transactionDesc = "Ventures Deposit"
}) {

    phone = normalizePhone(phone);

    if (!/^254\d{9}$/.test(phone)) {

        throw new Error(
            "Invalid Kenyan phone number"
        );

    }

    amount = Number(amount);

    if (
        !Number.isInteger(amount) ||
        amount < 1
    ) {

        throw new Error(
            "Invalid payment amount"
        );

    }


    // -----------------------------
    // ACCESS TOKEN
    // -----------------------------

    const accessToken =
        await getAccessToken();


    // -----------------------------
    // TIMESTAMP
    // -----------------------------

    const timestamp =
        generateTimestamp();


    // -----------------------------
    // PASSWORD
    // -----------------------------

    const password =
        Buffer.from(
            `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
        ).toString("base64");


    // -----------------------------
    // DARАJA STK REQUEST
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
                accountReference,

            TransactionDesc:
                transactionDesc

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


    return response.data;
}


// =========================================
// EXPORT
// =========================================

module.exports = {
    getAccessToken,
    generateTimestamp,
    normalizePhone,
    stkPush
};
