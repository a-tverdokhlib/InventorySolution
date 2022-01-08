const mongoose = require('mongoose');

const schema = mongoose.Schema;

const InventorySchema = new schema({
    user: {
        type: schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    number: {
        type: String,
        required: true
    },
    case_quantity: {
        type: Number,
        required: true,
        default:1
    },
    description: {
        type: String,
        required: true
    }, 
    qoh_case: {
        type: Number,
        required: true,
        default:0
    },
    qoh_units: {
        type: Number,
        required: true,
        default:0
    },
    case_weight: {
        type: Number,
        required: true,
        default:0
    },
    reorder_quantity: {
        type: Number,
        required: true,
        default:0
    },
    length: {
        type: Number,
        required: true,
        default:0
    },
    width: {
        type: Number,
        required: true,
        default:0
    },
    height: {
        type: Number,
        required: true,
        default:0
    },
    ship_ready: {
        type: Boolean,
        required: true,
        default:true
    },


}, { timestamps: true });

module.exports = mongoose.model('inventory', InventorySchema);