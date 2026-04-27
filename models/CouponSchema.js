const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
    code: { 
        type: String, 
        required: true, 
        unique: true, 
        uppercase: true, 
        trim: true 
    },
    discount: { 
        type: Number, 
        required: true 
    }, 
    type: { 
        type: String, 
        enum: ['single_use', 'date_limited'], 
        required: true 
    },
    expiryDate: { 
        type: Date 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    usedBy: [{ 
        type: String 
    }] 
}, { timestamps: true });

module.exports = mongoose.model('Coupon', CouponSchema);