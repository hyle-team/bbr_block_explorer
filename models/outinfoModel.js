'use strict'
const db = require('../lib/db')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const outinfoSchema = new Schema({
    amount :String,
    i :Number ,
    tx_id :String ,
    block :Number})
// UsersSchema.plugin(autoIncrement.mongoosePlugin {field: sequenceId step: 1})
db.model('out_info', outinfoSchema)
