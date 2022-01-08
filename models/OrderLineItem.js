const mongoose = require('mongoose');

const schema = mongoose.Schema;

const OrderLineItemSchema = new schema({
    quantity_cases: {
        type: Number,
        required: true,
        default: 0
    },
    quantity_units: {
        type: Number,
        required: true,
        default: 0
    },
    item: {
        type: schema.Types.ObjectId,
        ref: 'inventory',
        required: true

    },
    order: {
        type: schema.Types.ObjectId,
        ref: 'order',
        required: true
    },

}, { timestamps: true });

module.exports = mongoose.model('OrderLineItem', OrderLineItemSchema);