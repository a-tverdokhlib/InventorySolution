const mongoose = require('mongoose');

const schema = mongoose.Schema;

const RecipientSchema = new schema({
    user: {
        type: schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    contact: {
        type: String,
        required: true
    }, 
    phone: {
        type: String,
        required: true
    }, 
    email: {
        type: String,
        required: true
    }, 
    street1: {
        type: String,
        required: true
    }, 
    street2: {
        type: String
    }, 
    city: {
        type: String,
        required: true
    }, 
    state: {
        type: String,
        required: true
    }, 
    postal: {
        type: String,
        required: true
    }, 
    country: {
        type: String,
        required: true,
        default: 'US'
    },

});

module.exports = mongoose.model('Recipient', RecipientSchema);