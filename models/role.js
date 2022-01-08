const mongoose = require('mongoose');

const schema = mongoose.Schema;

const roleSchema = new schema({
    name:{
        type:String,
        unique:true,
        required:true
    }
});

module.exports = mongoose.model('role', roleSchema);