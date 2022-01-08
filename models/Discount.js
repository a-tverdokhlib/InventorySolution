const mongoose = require('mongoose');

const schema = mongoose.Schema;

const DiscountSchema = new schema({
    user:{
        type: schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    carrier:{
        type:String,
        required:true,
        default:'FedEx'
    },
    service:{
        type:String,
        required:true,
        default:'FEDEX_GROUND'
    },
    discount:{
        type:Number,
        required:true,
        default:0
    }
});

module.exports = mongoose.model('discount', DiscountSchema);