const mongoose = require('mongoose');

const schema = mongoose.Schema;

const orderSchema = new schema({
    user:{
        type: schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    recipient:{
        type: schema.Types.ObjectId,
        ref: 'Recipient',
        required: true
    },
    blind_company:{
        type:String,

    },
    blind_phone:{
        type:String,
        
    },
    customer_reference:{
        type:String,
        
    },
    shipped:{
        type:Date,
        
    },
    status:{
        type:Number,
        default:0
        
    },
    requested_carrier:{
        type:String,
        
    },
    requested_service:{
        type:String,
        
    },
    actual_carrier:{
        type:String,

    },
    actual_service:{
        type:String,

    },
    insurance_value:{
        type:Number,
        required:true,
        default:0
    },
    shipping_cost:{
        type:Number,
        required:true,
        default:0
    },
    customs_value:{
        type:Number,
        required:true,
        default:0
    },
    customs_description:{
        type:String,
        // required:true,
    },
    notify_recipient:{
        type:Boolean,
        required:true,
        default:false
    },
    additionally_notify:{
        type:String,
    }, 
    easypost_order_id:{
        type:String
    },
    signature_option:{
        type:String
    },
    tracking:{
        type:String
    },
    line_items:{
        type: schema.Types.ObjectId,
        ref: 'OrderLineItem'
    },  

},{timestamps:true});

module.exports = mongoose.model('order', orderSchema);