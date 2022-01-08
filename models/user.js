const mongoose = require('mongoose');

const schema = mongoose.Schema;

const userSchema = new schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique:true
    },
    confirmed_at: {
        type: Date,
        required: true
    },
    is_enabled:{
        type:Boolean,
        default:false
    },
    send_tracking_emails_by_default:{
        type:Boolean,
        default:true
    },
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    company: {
        type: String,
        default:'Company',
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    role: {
        type: schema.Types.ObjectId,
        ref: 'role',
        required:true
    },
    shipping_discounts:{
        type: schema.Types.ObjectId,
        ref: 'discount',
    }

});

module.exports = mongoose.model('user', userSchema);