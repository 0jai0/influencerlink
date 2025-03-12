// routes/phonepeRoutes.js
const express = require('express');
const router = express.Router();
const {createPayment,capturePayment,} = require('../../controllers/payment/payment-controller');

router.post('/pay', createPayment);
router.all('/pay-return-url', capturePayment);

module.exports = router;
