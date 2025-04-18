const axios = require("axios");
const crypto = require("crypto");
const mongoose = require("mongoose");
const PaymentTransaction = require("../../models/PaymentTransaction");
const PageOwner = require("../../models/PageUser");
const config = require("./config.json");

const { MERCHANT_KEY, MERCHANT_ID } = config;


function calculateLinkCoins(totalAmount) {
  let base = Math.floor(totalAmount / 5); // Default: ₹5 = 1 LinkCoin
  let bonus = 0;

  // Bonus rules
  if (totalAmount >= 50 && totalAmount <= 120) {
    bonus = 1;
  } else if (totalAmount >= 125 && totalAmount <= 245) {
    bonus = 5;
  } else if (totalAmount >= 250) {
    bonus = 12;
  }

  return base + bonus;
}

const MERCHANT_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";
const MERCHANT_STATUS_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status";
const REDIRECT_URL = "https://api.promoterlink.com/api/payment/pay-return-url";
const SUCCESS_URL = "https://promoterlink.com/payment-success";
const FAILURE_URL = "https://promoterlink.com/payment-failure";

const createPayment = async (req, res) => {
  try {
    const { userId, totalAmount } = req.body;
    const transactionId = new mongoose.Types.ObjectId().toString();
    const linkCoinsToAdd = calculateLinkCoins(totalAmount);
  

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
