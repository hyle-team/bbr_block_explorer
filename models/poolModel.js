'use strict'
const db = require('../lib/db')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const poolSchema = new Schema({
    blob_size :String,
    fee :String ,
    id :String ,
    timestamp :String })
// UsersSchema.plugin(autoIncrement.mongoosePlugin {field: sequenceId step: 1})
db.model('pool', poolSchema)
