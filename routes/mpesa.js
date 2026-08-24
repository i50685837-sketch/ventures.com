const express = require("express");

const router = express.Router();

const {
    stkPush,
    callback,
    mpesaHealth
} = require("../controllers/mpesaController");


/* =========================================
   M-PESA DARАJA ROUTES
========================================= */


/*
 * =========================================
 * HEALTH CHECK
 *
 * GET /api/mpesa
 * =========================================
 */

router.get(
    "/",
    mpesaHealth
);


/*
 * =========================================
 * STK PUSH
 *
 * POST /api/mpesa/stkpush
 *
 * Body:
 * {
 *   "phone": "0712345678",
 *   "amount": 100,
 *   "accountReference": "VENTURES",
 *   "transactionDesc": "Wallet Deposit"
 * }
 * =========================================
 */

router.post(
    "/stkpush",
    stkPush
);


/*
 * =========================================
 * M-PESA CALLBACK
 *
 * POST /api/mpesa/callback
 *
 * Safaricom sends the payment result here.
 * =========================================
 */

router.post(
    "/callback",
    callback
);


/* =========================================
   EXPORT ROUTER
========================================= */

module.exports = router;
