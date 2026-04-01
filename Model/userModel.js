const { Schema, default: mongoose } = require("mongoose");

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verifyOtp: { type: String, default: '' },
  verifyOtpExpiresAt: { type: Number, default: 0 },
  isAccountVerified: { type: Boolean, default: false },
  resetOtp: { type: String, default: '' },
  resetOtpExpiresAt: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 },
  
  // Add transactions array
  transactions: [{
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true },
    description: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    balanceAfter: { type: Number, required: true }
  }],
  
  stockTransactions: [{
    stockName: { type: String, required: true },
    buyingPrice: { type: Number, required: true },
    buyingQuantity: { type: Number, required: true },
    buyingDate: { type: Date, default: Date.now },
    sellingDate: { type: Date, default: null },
    sellingPrice: { type: Number, default: null }
  }]
}, {
  timestamps: true 
});

const userModel = mongoose.models.user || mongoose.model('user', userSchema);

module.exports = { userModel };