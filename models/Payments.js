const mongoose = require("mongoose");

const PaymentsSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    client_id: { type: String, required: true },
    email: { type: String, required: true },
    plan: {
        type: String,
        enum: [
            'starter', 'pro', 'elite', 'voucher',
            'b2b_seis', 'b2b_doce',
            'starter+voucher', 'pro+voucher', 'elite+voucher',
        ]
    },
    amount: { type: Number, required: true },
    mp_payment_id: { type: String },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'in_process'],
        default: 'pending'
    },
    couponUsed: { type: String, default: null },
    discount: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

const PaymentsMongo = mongoose.model("payments", PaymentsSchema);

module.exports = PaymentsMongo;