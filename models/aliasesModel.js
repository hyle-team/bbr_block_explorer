'use strict'
const db = require('../lib/db')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const aliasesSchema = new Schema({
    alias :String, 
    address :String, 
    comment :String, 
    tracking_key :String, 
    block :Number, 
    transact :String, 
    enabled :Number 
})
// UsersSchema.plugin(autoIncrement.mongoosePlugin, {field: sequenceId, step: 1})
db.model('aliases', aliasesSchema)
