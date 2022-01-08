const mongoose = require('mongoose');

const schema = mongoose.Schema;

const userRulesSchema = new schema({
    user:{
        type: schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    role:{
        type: schema.Types.ObjectId,
        ref: 'role',
        required: true
    }
});

module.exports = mongoose.model('userRule', userRulesSchema);