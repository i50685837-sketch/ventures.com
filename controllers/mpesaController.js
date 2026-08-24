const {
    stkPush: initiateStkPush
} = require("../services/mpesaService");


/* =========================================
   M-PESA HEALTH
========================================= */

exports.mpesaHealth = (req, res) => {

    res.json({

        success: true,

        service: "M-PESA Daraja",

        status: "online",

        environment:
            process.env.MPESA_ENV || "sandbox",

        endpoints: {

            stkPush:
                "POST /api/mpesa/stkpush",

            callback:
                "POST /api/mpesa/callback"

        }

    });

};


/* =========================================
   STK PUSH
========================================= */

exports.stkPush = async (req, res) => {

    try {

        const {
            phone,
            amount,
            accountReference,
            transactionDesc
        } = req.body;


        /* -----------------------------
           VALIDATION
        ----------------------------- */

        if (!phone || amount === undefined) {

            return res.status(400).json({

                success: false,

                message:
                    "Phone number and amount are required"

            });

        }


        /* -----------------------------
           SEND STK
        ----------------------------- */

        const result =
            await initiateStkPush({

                phone,
                amount,

                accountReference:
                    accountReference ||
                    "VENTURES",

                transactionDesc:
                    transactionDesc ||
                    "Ventures Deposit"

            });


        /* -----------------------------
           RESPONSE
        ----------------------------- */

        return res.status(200).json({

            success: true,

            message:
                "STK Push initiated successfully",

            data: result

        });


    } catch (error) {

        console.error(
            "❌ STK PUSH CONTROLLER ERROR:",
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
                    : error.response?.data ||
                      error.message

        });

    }

};


/* =========================================
   M-PESA CALLBACK
========================================= */

exports.callback = async (req, res) => {

    try {

        console.log(
            "📥 M-PESA CALLBACK RECEIVED"
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

                ResultDesc:
                    "Accepted"

            });

        }


        const {
            ResultCode,
            ResultDesc,
            CheckoutRequestID,
            MerchantRequestID,
            CallbackMetadata
        } = callback;


        console.log(
            "MerchantRequestID:",
            MerchantRequestID
        );

        console.log(
            "CheckoutRequestID:",
            CheckoutRequestID
        );


        /* =================================
           SUCCESS
        ================================= */

        if (ResultCode === 0) {

            console.log(
                "✅ M-PESA PAYMENT SUCCESS"
            );


            console.log(
                "CheckoutRequestID:",
                CheckoutRequestID
            );


            /*
             * IMPORTANT:
             *
             * Do NOT automatically credit
             * the wallet here yet.
             *
             * First:
             *
             * 1. Find pending transaction
             * 2. Match CheckoutRequestID
             * 3. Verify amount
             * 4. Verify phone
             * 5. Extract MpesaReceiptNumber
             * 6. Mark transaction SUCCESS
             * 7. Credit wallet exactly once
             */


            if (CallbackMetadata?.Item) {

                console.log(
                    "📦 Callback metadata received"
                );

                console.log(
                    JSON.stringify(
                        CallbackMetadata.Item,
                        null,
                        2
                    )
                );

            }

        }


        /* =================================
           FAILED / CANCELLED
        ================================= */

        else {

            console.log(
                "❌ M-PESA PAYMENT FAILED"
            );

            console.log(
                "ResultCode:",
                ResultCode
            );

            console.log(
                "ResultDesc:",
                ResultDesc
            );

        }


        /* =================================
           ACKNOWLEDGE CALLBACK
        ================================= */

        return res.json({

            ResultCode: 0,

            ResultDesc:
                "Callback received successfully"

        });


    } catch (error) {

        console.error(
            "❌ M-PESA CALLBACK ERROR:",
            error.message
        );


        /*
         * Always acknowledge the callback
         * so Daraja doesn't repeatedly retry
         * unnecessarily.
         */

        return res.json({

            ResultCode: 0,

            ResultDesc:
                "Callback received"

        });

    }

};
