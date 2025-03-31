const mongoose = require('mongoose');

const PaymentTransactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'PageUser', required: true },
  amount: { type: Number, required: true },
  linkCoinsAdded: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PaymentTransaction', PaymentTransactionSchema);
