const axios = require("axios");
const crypto = require("crypto");
const mongoose = require("mongoose");
const PaymentTransaction = require("../../models/PaymentTransaction");
const PageOwner = require("../../models/PageUser");
const config = require("./config.json");

const { MERCHANT_KEY, MERCHANT_ID } = config;
const packageBonuses = {
  50: { base: 10, bonus: 1 },   // 10+1 for ₹50 (10×5)
  125: { base: 25, bonus: 5 },  // 25+5 for ₹125 (25×5)
  250: { base: 50, bonus: 12 }  // 50+12 for ₹250 (50×5)
};

const MERCHANT_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";
const MERCHANT_STATUS_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status";
const REDIRECT_URL = "https://influencerlink-418814689343.asia-south1.run.app/api/payment/pay-return-url";
const SUCCESS_URL = "https://lnfluencerlink.com/payment-success";
const FAILURE_URL = "https://lnfluencerlink.com/payment-failure";

const createPayment = async (req, res) => {
  try {
    const { userId, totalAmount } = req.body;
    const transactionId = new mongoose.Types.ObjectId().toString();
    let linkCoinsToAdd;
    if (packageBonuses[totalAmount]) {
      const package = packageBonuses[totalAmount];
      linkCoinsToAdd = package.base + package.bonus;
    } else {
      // Default calculation if no package selected (₹5 = 1 LinkCoin)
      linkCoinsToAdd = Math.floor(totalAmount / 5);
    }
    

    const paymentTransaction = new PaymentTransaction({
      _id: transactionId,
      userId,
      amount: totalAmount,
      transactionId,
      linkCoinsAdded: linkCoinsToAdd,
    });
    await paymentTransaction.save();

    const paymentPayload = {
      merchantId: MERCHANT_ID,
      merchantUserId: userId,
      amount: totalAmount * 100,
      merchantTransactionId: transactionId,
      redirectUrl: `${REDIRECT_URL}/?id=${transactionId}`,
      redirectMode: "POST",
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const payload = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
    const keyIndex = 1;
    const stringToHash = payload + "/pg/v1/pay" + MERCHANT_KEY;
    const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const checksum = `${sha256}###${keyIndex}`;

    const response = await axios.post(MERCHANT_BASE_URL, { request: payload }, {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
      },
    });

    const redirectUrl = response.data?.data?.instrumentResponse?.redirectInfo?.redirectUrl ||
                         response.data?.data?.instrumentResponse?.redirectInfo?.url;

    res.status(201).json({ success: true, approvalURL: redirectUrl, transactionId });
  } catch (error) {
    console.error("Payment Creation Error:", error);
    res.status(500).json({ success: false, message: "Error while creating payment transaction" });
  }
};

const capturePayment = async (req, res) => {
  const { id: transactionId } = req.query;
  try {
    const paymentTransaction = await PaymentTransaction.findOne({ transactionId }).lean();;
    if (!paymentTransaction) {
      return res.status(404).json({ success: false, message: "Payment transaction not found" });
    }

    const keyIndex = 1;
    const stringToHash = `/pg/v1/status/${MERCHANT_ID}/${transactionId}` + MERCHANT_KEY;
    const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const checksum = `${sha256}###${keyIndex}`;

    const response = await axios.get(`${MERCHANT_STATUS_URL}/${MERCHANT_ID}/${transactionId}`, {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": MERCHANT_ID,
      },
    });

    if (response.data?.success) {
      const pageOwner = await PageOwner.findById(paymentTransaction.userId);
      if (pageOwner) {
        const updatedLinkCoins = pageOwner.linkCoins + paymentTransaction.linkCoinsAdded;
        await PageOwner.findByIdAndUpdate(paymentTransaction.userId, {
          linkCoins: updatedLinkCoins,
          $push: { payments: {
            transactionId: paymentTransaction.transactionId,
            amount: paymentTransaction.amount,
            status: "Success",
            linkCoinsAdded: paymentTransaction.linkCoinsAdded,
            date: new Date()
          }}
        });
      }
      res.redirect(`${SUCCESS_URL}/?id=${transactionId}`);
    } else {
      res.redirect(`${FAILURE_URL}/?id=${transactionId}`);
    }
  } catch (error) {
    console.error("Payment Capture Error:", error);
    res.status(500).json({ success: false, message: "Error while capturing payment" });
  }
};

module.exports = { createPayment, capturePayment };
