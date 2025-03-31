const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    paymentId: { type: String, required: true },
    pageOwnerId: { type: String, required: true },
    paymentStatus: { type: String, default: "pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
