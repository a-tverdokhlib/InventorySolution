const mongoose = require('mongoose');

const schema = mongoose.Schema;

const updateSchama = new schema({
    user:{
        type: schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    filename:{
        type:String,
        required:true
    },
    kind:{
        type:String,
        required:true,
        default:'order'
    }

},{timestamps:true});

module.exports = mongoose.model('update', updateSchama);