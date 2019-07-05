'use strict'
const db = require('../lib/db')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const transactionsSchema = new Schema({
    keeper_block: {
        type: Number
    },
    id :String,  
    amount :String,
    blob_size :Number, 
    extra :String, 
    fee :String, 
    ins :String, 
    outs :String, 
    pub_key :String, 
    timestamp :Number, 
    attachments :String 
})
// UsersSchema.plugin(autoIncrement.mongoosePlugin, {field: 'sequenceId', step: 1})
db.model('transactions', transactionsSchema)
